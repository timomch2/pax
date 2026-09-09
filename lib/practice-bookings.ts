import { randomBytes } from 'crypto';
import { Prisma, type PracticeAvailability } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { assertPractice, practiceMembershipActive } from '@/lib/practice-policy';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
import { practiceTokenHash } from '@/lib/practice-team';
import { assertCalendarAvailable } from '@/lib/practice-calendar-service';
import { enqueueNotification } from '@/lib/notification-service';

type Db = Prisma.TransactionClient;
const iso = z.string().datetime({ offset: true });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, 'Invalid date');
export const availabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6).nullable(), date: dateSchema.nullable(), closed: z.boolean().default(false),
  startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440),
  durationMinutes: z.number().int().min(10).max(240), bufferMinutes: z.number().int().min(0).max(120),
  facilityId: z.string().cuid().nullable(), location: z.string().trim().min(2).max(200), appointmentType: z.string().trim().min(2).max(100), feeMinor: z.number().int().min(0).max(2000000000),
}).strict().refine((v) => (v.date === null) !== (v.weekday === null), 'Choose a weekday or an exception date').refine((v) => v.closed || v.endMinute - v.startMinute >= v.durationMinutes, 'Availability must fit an appointment');

export function availabilitySlots(rules: PracticeAvailability[], date: string) {
  const midnight = new Date(`${date}T00:00:00+03:00`);
  const weekday = new Date(`${date}T12:00:00+03:00`).getUTCDay();
  const exceptions = rules.filter((r) => r.date === date);
  const selected = exceptions.length ? exceptions : rules.filter((r) => r.date === null && r.weekday === weekday);
  if (selected.some((r) => r.closed)) return [];
  return selected.flatMap((r) => {
    const slots = [];
    for (let minute = r.startMinute + r.bufferMinutes; minute + r.durationMinutes + r.bufferMinutes <= r.endMinute; minute += r.durationMinutes + 2 * r.bufferMinutes) {
      slots.push({ availabilityId: r.id, startsAt: new Date(midnight.getTime() + minute * 60000), endsAt: new Date(midnight.getTime() + (minute + r.durationMinutes) * 60000), bufferMinutes: r.bufferMinutes, facilityId: r.facilityId, location: r.location, appointmentType: r.appointmentType, feeMinor: r.feeMinor });
    }
    return slots;
  });
}

async function publicWorkspace(db: Db, slug: string) {
  assertPractice(process.env.PRACTICE_WORKSPACE_ENABLED === 'true', 404, 'Booking unavailable');
  const workspace = await db.practiceWorkspace.findUnique({ where: { bookingSlug: slug }, include: { owner: true } });
  assertPractice(workspace?.bookingEnabled && practiceMembershipActive(workspace.owner), 404, 'This practitioner is not currently accepting public requests');
  return workspace;
}

async function availableSlots(db: Db, workspaceId: string, ownerId: string, date: string) {
  const rules = await db.practiceAvailability.findMany({ where: { workspaceId, active: true } });
  const slots = availabilitySlots(rules, date).filter((slot) => slot.startsAt.getTime() > Date.now() + 3600000);
  if (!slots.length) return [];
  const start = new Date(`${date}T00:00:00+03:00`), end = new Date(start.getTime() + 86400000);
  const [events, legacy, relationships] = await Promise.all([
    db.practiceEvent.findMany({ where: { workspaceId, status: 'SCHEDULED', startsAt: { lt: new Date(end.getTime() + 7200000) }, endsAt: { gt: new Date(start.getTime() - 7200000) } }, select: { startsAt: true, endsAt: true, bufferMinutes: true } }),
    db.appointment.findMany({ where: { practitionerId: ownerId, status: 'SCHEDULED', practiceEvent: null, dateTime: { gte: new Date(start.getTime() - 9000000), lt: new Date(end.getTime() + 7200000) } }, select: { dateTime: true } }),
    db.consultingFacility.findMany({ where: { workspaceId } }),
  ]);
  const busy = [...events.map((e) => ({ startsAt: new Date(e.startsAt.getTime() - e.bufferMinutes * 60000), endsAt: new Date(e.endsAt.getTime() + e.bufferMinutes * 60000) })), ...legacy.map((a) => ({ startsAt: a.dateTime, endsAt: new Date(a.dateTime.getTime() + 1800000) }))];
  return slots.filter((slot) => (!slot.facilityId || relationships.some((r) => r.facilityId === slot.facilityId && r.startsAt <= slot.startsAt && (!r.endsAt || r.endsAt >= slot.endsAt))) && !busy.some((b) => slot.startsAt.getTime() - slot.bufferMinutes * 60000 < b.endsAt.getTime() && slot.endsAt.getTime() + slot.bufferMinutes * 60000 > b.startsAt.getTime()));
}

function bookingDate(start: Date) { return new Date(start.getTime() + 10800000).toISOString().slice(0, 10); }
function validateHorizon(date: string) { dateSchema.parse(date); const d = new Date(`${date}T00:00:00+03:00`).getTime(); assertPractice(d >= Date.now() - 86400000 && d <= Date.now() + 90 * 86400000, 400, 'Choose a date within the next 90 days'); }

export async function publicSlots(slug: string, date: string) {
  validateHorizon(date);
  const workspace = await publicWorkspace(prisma, slug);
  const slots = await availableSlots(prisma, workspace.id, workspace.ownerId, date);
  return { practitioner: workspace.owner.name, slots: slots.map(({ bufferMinutes: _buffer, facilityId: _facility, ...slot }) => slot) };
}

export async function saveAvailability(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.discriminatedUnion('action', [
    z.object({ action: z.literal('rule'), rule: availabilitySchema }).strict(),
    z.object({ action: z.literal('remove'), id: z.string().cuid() }).strict(),
    z.object({ action: z.literal('settings'), bookingEnabled: z.boolean(), remindersEnabled: z.boolean(), appointmentReminderHours: z.number().int().min(1).max(168), overdueReminderDays: z.array(z.number().int().min(1).max(90)).max(5) }).strict(),
  ]).parse(raw);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId); await authorizePracticeUser(actorId, workspaceId, 'workspace.manage', tx);
    if (body.action === 'rule') {
      if (body.rule.facilityId) assertPractice(await tx.consultingFacility.findFirst({ where: { workspaceId, facilityId: body.rule.facilityId } }), 400, 'Select a facility you consult for');
      assertPractice(await tx.practiceAvailability.count({ where: { workspaceId, active: true } }) < 200, 400, 'Remove old availability exceptions before adding more');
      return tx.practiceAvailability.create({ data: { ...body.rule, workspaceId } });
    }
    if (body.action === 'remove') { await tx.practiceAvailability.updateMany({ where: { id: body.id, workspaceId }, data: { active: false } }); return { ok: true }; }
    const { action: _action, ...settings } = body;
    if (settings.bookingEnabled) assertPractice(await tx.practiceAvailability.count({ where: { workspaceId, active: true, closed: false } }), 400, 'Configure availability before enabling public bookings');
    await tx.practiceWorkspace.update({ where: { id: workspaceId }, data: settings }); return { ok: true };
  });
}

export async function startBooking(slug: string, raw: unknown, origin: string) {
  const body = z.object({ email: z.string().trim().email().max(320).transform((s) => s.toLowerCase()), name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).nullable(), availabilityId: z.string().cuid(), startsAt: iso, remindersEnabled: z.boolean().default(true) }).strict().parse(raw);
  validateHorizon(bookingDate(new Date(body.startsAt)));
  const workspace = await publicWorkspace(prisma, slug);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspace.id); await publicWorkspace(tx, slug);
    const slot = (await availableSlots(tx, workspace.id, workspace.ownerId, bookingDate(new Date(body.startsAt)))).find((s) => s.availabilityId === body.availabilityId && s.startsAt.getTime() === new Date(body.startsAt).getTime());
    assertPractice(slot, 409, 'This slot is no longer available');
    const token = randomBytes(32).toString('hex');
    const booking = await tx.practiceBookingRequest.create({ data: { ...body, startsAt: slot.startsAt, endsAt: slot.endsAt, workspaceId: workspace.id, tokenHash: practiceTokenHash(token), tokenExpiresAt: new Date(Date.now() + 1800000) } });
    const queued = await enqueueNotification(tx, { recipient: body.email, templateSlug: 'practice.booking-verification', variables: { verificationUrl: `${origin}/book/${slug}#${token}` }, idempotencyKey: `practice:verify:${booking.id}` });
    return { status: 'VERIFICATION_REQUIRED', deliveryStatus: queued.status };
  });
}

async function createApprovedEvent(tx: Db, booking: { id: string; workspaceId: string; name: string; email: string; phone: string | null; patientId: string | null; availabilityId: string }, workspace: { ownerId: string }, startsAt: Date) {
  const slot = (await availableSlots(tx, booking.workspaceId, workspace.ownerId, bookingDate(startsAt))).find((s) => s.availabilityId === booking.availabilityId && s.startsAt.getTime() === startsAt.getTime());
  assertPractice(slot, 409, 'Availability changed or this slot is occupied. Propose another available time.');
  await assertCalendarAvailable(tx, booking.workspaceId, workspace.ownerId, [{ startsAt: new Date(slot.startsAt.getTime() - slot.bufferMinutes * 60000), endsAt: new Date(slot.endsAt.getTime() + slot.bufferMinutes * 60000) }], [], null, false);
  let patientId = booking.patientId;
  if (patientId) assertPractice(await tx.hubPatient.findFirst({ where: { id: patientId, practitionerId: workspace.ownerId } }), 404, 'Patient not found');
  else { const patient = await tx.hubPatient.create({ data: { practitionerId: workspace.ownerId, name: booking.name, email: booking.email, phone: booking.phone, patientCode: `PAX-P-${randomBytes(6).toString('hex').toUpperCase()}` } }); patientId = patient.id; }
  const event = await tx.practiceEvent.create({ data: { workspaceId: booking.workspaceId, kind: 'APPOINTMENT', bufferMinutes: slot.bufferMinutes, title: slot.appointmentType, serviceCode: slot.appointmentType, startsAt: slot.startsAt, endsAt: slot.endsAt, patientId, facilityId: slot.facilityId, location: slot.location, billable: slot.feeMinor > 0, feeMinor: slot.feeMinor, rateSnapshot: { source: 'PUBLIC_BOOKING', availabilityId: slot.availabilityId }, createdById: workspace.ownerId } });
  return { eventId: event.id, patientId, startsAt: slot.startsAt, endsAt: slot.endsAt };
}

async function bookingUpdate(tx: Db, booking: { id: string; email: string; version: number; startsAt: Date }, slug: string, origin: string, message: string, token?: string) {
  return enqueueNotification(tx, { recipient: booking.email, templateSlug: 'practice.booking-update', variables: { message, time: booking.startsAt.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }), actionUrl: `${origin}/book/${slug}${token ? `#${token}` : ''}` }, idempotencyKey: `practice:booking:${booking.id}:${booking.version}` });
}

export async function confirmBookingToken(slug: string, raw: unknown, origin: string) {
  const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(raw);
  const workspace = await publicWorkspace(prisma, slug);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspace.id); await publicWorkspace(tx, slug);
    const booking = await tx.practiceBookingRequest.findFirst({ where: { workspaceId: workspace.id, tokenHash: practiceTokenHash(token) } });
    assertPractice(booking && !booking.tokenUsedAt && booking.tokenExpiresAt > new Date(), 410, 'This link has expired or has already been used');
    assertPractice(booking.status === 'UNVERIFIED' || booking.status === 'PROPOSED', 409, 'This request no longer needs confirmation');
    const approved = booking.status === 'PROPOSED' ? await createApprovedEvent(tx, booking, workspace, booking.proposedStartsAt!) : {};
    const updated = await tx.practiceBookingRequest.update({ where: { id: booking.id }, data: { ...approved, status: booking.status === 'PROPOSED' ? 'APPROVED' : 'PENDING', verifiedAt: booking.verifiedAt ?? new Date(), tokenUsedAt: new Date(), version: { increment: 1 } } });
    await bookingUpdate(tx, updated, slug, origin, updated.status === 'APPROVED' ? 'Your proposed appointment time is confirmed.' : 'Your email is verified. The practitioner will review your request; your appointment is not yet confirmed.');
    return { status: updated.status };
  });
}

export async function reviewBooking(actorId: string, workspaceId: string, raw: unknown, origin: string) {
  const body = z.object({ id: z.string().cuid(), version: z.number().int().positive(), action: z.enum(['APPROVE', 'DECLINE', 'PROPOSE']), startsAt: iso.optional(), availabilityId: z.string().cuid().optional(), patientId: z.string().cuid().nullable().default(null), distinctPatientReason: z.string().trim().min(5).max(500).optional() }).strict().parse(raw);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId); const auth = await authorizePracticeUser(actorId, workspaceId, 'booking.manage', tx);
    const workspace = await tx.practiceWorkspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const booking = await tx.practiceBookingRequest.findFirst({ where: { id: body.id, workspaceId } });
    assertPractice(booking && ['PENDING', 'PROPOSED'].includes(booking.status) && booking.version === body.version, 409, 'Request changed. Refresh before reviewing.');
    let approved = {}, token: string | undefined;
    if (body.action !== 'DECLINE') {
      if (body.patientId) assertPractice(await tx.hubPatient.findFirst({ where: { id: body.patientId, practitionerId: auth.ownerId } }), 404, 'Patient not found');
      else {
        const matches = await tx.hubPatient.findMany({ where: { practitionerId: auth.ownerId, OR: [{ email: booking.email }, { name: { equals: booking.name, mode: 'insensitive' } }, ...(booking.phone ? [{ phone: booking.phone }] : [])] }, select: { id: true, name: true, patientCode: true }, take: 10 });
        if (matches.length && !body.distinctPatientReason) return { requiresPatientReview: true, matches };
      }
    }
    if (body.action === 'APPROVE') {
      assertPractice(booking.status === 'PENDING', 409, 'A proposed time requires patient confirmation');
      approved = await createApprovedEvent(tx, { ...booking, patientId: body.patientId }, workspace, booking.startsAt);
    }
    if (body.action === 'PROPOSE') {
      assertPractice(body.startsAt && body.availabilityId, 400, 'Select an available alternative time');
      const date = bookingDate(new Date(body.startsAt)); validateHorizon(date);
      const slot = (await availableSlots(tx, workspaceId, auth.ownerId, date)).find((s) => s.availabilityId === body.availabilityId && s.startsAt.getTime() === new Date(body.startsAt!).getTime());
      assertPractice(slot, 409, 'Choose an available appointment slot');
      token = randomBytes(32).toString('hex');
      approved = { availabilityId: slot.availabilityId, proposedStartsAt: slot.startsAt, proposedEndsAt: slot.endsAt, tokenHash: practiceTokenHash(token), tokenUsedAt: null, tokenExpiresAt: new Date(Math.min(Date.now() + 86400000, slot.startsAt.getTime() - 3600000)) };
    }
    const updated = await tx.practiceBookingRequest.update({ where: { id: booking.id }, data: { patientId: body.patientId, ...approved, status: body.action === 'APPROVE' ? 'APPROVED' : body.action === 'DECLINE' ? 'DECLINED' : 'PROPOSED', version: { increment: 1 } } });
    await bookingUpdate(tx, { ...updated, startsAt: updated.proposedStartsAt ?? updated.startsAt }, workspace.bookingSlug, origin, body.action === 'PROPOSE' ? 'The practitioner proposed another time. Follow the link to confirm it. This time is not reserved.' : body.action === 'APPROVE' ? 'Your appointment is confirmed.' : 'Your appointment request was declined.', token);
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: `BOOKING_${body.action}`, entityId: booking.id, context: { distinctPatientReason: body.distinctPatientReason ?? null } } });
    return { status: updated.status };
  });
}
