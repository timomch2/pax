import { queueCalendarMessage } from '@/lib/practice-delivery';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
import { assertPractice } from '@/lib/practice-policy';
import { recurringDates, eventInputSchema, timeRangesOverlap, type EventInput } from '@/lib/practice-calendar';

export async function assertCalendarAvailable(tx: Prisma.TransactionClient, workspaceId: string, ownerId: string, ranges: { startsAt: Date; endsAt: Date }[], excluded: string[], overrideReason: string | null, isOwner: boolean, excludedLegacy: string[] = []) {
  if (overrideReason) assertPractice(isOwner, 403, 'Only the practitioner can override a clash');
  const earliest = new Date(Math.min(...ranges.map((range) => range.startsAt.getTime())));
  const latest = new Date(Math.max(...ranges.map((range) => range.endsAt.getTime())));
  const events = await tx.practiceEvent.findMany({ where: { workspaceId, status: 'SCHEDULED', id: { notIn: excluded }, startsAt: { lt: new Date(latest.getTime() + 7200000) }, endsAt: { gt: new Date(earliest.getTime() - 7200000) } }, select: { startsAt: true, endsAt: true, bufferMinutes: true } });
  // Until reconciliation, legacy appointments also reserve their existing time (30 minute default).
  const legacy = await tx.appointment.findMany({ where: { practitionerId: ownerId, id: { notIn: excludedLegacy }, status: 'SCHEDULED', practiceEvent: null, dateTime: { gt: new Date(earliest.getTime() - 1800000), lt: latest } }, select: { dateTime: true } });
  const occupied = [...events.map((e) => ({ startsAt: new Date(e.startsAt.getTime() - e.bufferMinutes * 60000), endsAt: new Date(e.endsAt.getTime() + e.bufferMinutes * 60000) })), ...legacy.map((row) => ({ startsAt: row.dateTime, endsAt: new Date(row.dateTime.getTime() + 1800000) }))];
  const clash = ranges.some((range) => occupied.some((existing) => timeRangesOverlap(range, existing)));
  assertPractice(!clash || (isOwner && overrideReason), 409, 'This time overlaps an existing booking. Only the practitioner can approve an override with a reason.');
}

async function eventData(tx: Prisma.TransactionClient, workspaceId: string, ownerId: string, body: EventInput, startsAt: Date, endsAt: Date) {
  if (body.patientId) assertPractice(await tx.hubPatient.findFirst({ where: { id: body.patientId, practitionerId: ownerId }, select: { id: true } }), 404, 'Patient not found');
  const relationship = body.facilityId ? await tx.consultingFacility.findFirst({ where: { workspaceId, facilityId: body.facilityId, startsAt: { lte: startsAt }, OR: [{ endsAt: null }, { endsAt: { gte: endsAt } }] } }) : null;
  if (body.facilityId) assertPractice(relationship, 400, 'Add a consulting relationship covering this event before selecting the facility');
  const covered = Boolean(relationship?.rateType === 'MONTHLY' && relationship.coveredServices.some((service) => service.toLowerCase() === body.serviceCode?.toLowerCase()));
  const hourly = relationship?.rateType === 'HOUR';
  const defaultMinor = relationship?.rateType === 'MONTHLY' ? 0 : hourly
    ? Number((BigInt(relationship?.rateMinor ?? 0) * BigInt(endsAt.getTime() - startsAt.getTime()) + 1800000n) / 3600000n)
    : relationship?.rateMinor ?? 0;
  const feeMinor = !body.billable || covered ? 0 : body.feeMinor ?? defaultMinor;
  assertPractice(feeMinor <= 2000000000, 400, 'Calculated fee exceeds the supported limit');
  const { recurrence: _recurrence, ...fields } = body;
  return { ...fields, startsAt, endsAt, feeMinor, rateSnapshot: { relationshipId: relationship?.id ?? null, rateType: relationship?.rateType ?? 'SERVICE', rateMinor: relationship?.rateMinor ?? 0, explicitFee: body.feeMinor, coveredByRetainer: covered } };
}

export async function createPracticeEvents(actorId: string, workspaceId: string, raw: unknown, origin?: string) {
  const body = eventInputSchema.parse(raw);
  let ranges: ReturnType<typeof recurringDates>;
  try { ranges = recurringDates(new Date(body.startsAt), new Date(body.endsAt), body.recurrence); }
  catch (error) { assertPractice(false, 400, (error as Error).message); }
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId);
    const auth = await authorizePracticeUser(actorId, workspaceId, 'calendar.manage', tx);
    await assertCalendarAvailable(tx, workspaceId, auth.ownerId, ranges, [], body.overrideReason, auth.isOwner);
    const series = body.recurrence ? await tx.practiceEventSeries.create({ data: { workspaceId, frequency: body.recurrence.frequency, until: new Date(body.recurrence.until) } }) : null;
    const ids: string[] = [];
    for (const range of ranges) {
      const fields = await eventData(tx, workspaceId, auth.ownerId, body, range.startsAt, range.endsAt);
      const event = await tx.practiceEvent.create({ data: { ...fields, workspaceId, seriesId: series?.id, createdById: actorId } }); ids.push(event.id);
      await queueCalendarMessage(tx, event.id, 'Your appointment is confirmed.', origin);
    }
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'CALENDAR_EVENTS_CREATED', entityId: ids[0], context: { count: ids.length, overrideReason: body.overrideReason } } });
    return { ids };
  });
}

export async function updatePracticeEvent(actorId: string, workspaceId: string, eventId: string, raw: unknown, origin?: string) {
  const body = z.discriminatedUnion('action', [
    z.object({ action: z.literal('edit'), version: z.number().int().positive(), scope: z.enum(['ONE', 'FUTURE']).default('ONE'), event: eventInputSchema }).strict(),
    z.object({ action: z.literal('status'), version: z.number().int().positive(), status: z.enum(['COMPLETED', 'CANCELLED', 'NO_SHOW']), scope: z.enum(['ONE', 'FUTURE']).default('ONE') }).strict(),
  ]).parse(raw);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId);
    const auth = await authorizePracticeUser(actorId, workspaceId, 'calendar.manage', tx);
    const existing = await tx.practiceEvent.findFirst({ where: { id: eventId, workspaceId } });
    assertPractice(existing, 404, 'Event not found');
    assertPractice(existing.version === body.version, 409, 'This event has changed. Refresh before editing.');
    assertPractice(existing.status === 'SCHEDULED', 409, 'Completed or closed events are preserved and cannot be edited');
    if (body.action === 'status' && body.status !== 'CANCELLED') assertPractice(body.scope === 'ONE', 400, 'Complete or mark a no-show one event at a time');
    const selected = body.scope === 'FUTURE' && existing.seriesId ? await tx.practiceEvent.findMany({ where: { workspaceId, seriesId: existing.seriesId, startsAt: { gte: existing.startsAt }, status: 'SCHEDULED' }, orderBy: { startsAt: 'asc' } }) : [existing];
    if (body.action === 'edit') {
      assertPractice(!body.event.recurrence, 400, 'Edit existing occurrences without supplying a new recurrence rule');
      const delta = new Date(body.event.startsAt).getTime() - existing.startsAt.getTime();
      const duration = new Date(body.event.endsAt).getTime() - new Date(body.event.startsAt).getTime();
      const ranges = selected.map((event) => ({ startsAt: new Date(event.startsAt.getTime() + delta), endsAt: new Date(event.startsAt.getTime() + delta + duration) }));
      for (let i = 1; i < ranges.length; i++) assertPractice(!timeRangesOverlap(ranges[i - 1], ranges[i]), 409, 'The edited recurring events overlap each other');
      await assertCalendarAvailable(tx, workspaceId, auth.ownerId, ranges.map((range, i) => ({ startsAt: new Date(range.startsAt.getTime() - selected[i].bufferMinutes * 60000), endsAt: new Date(range.endsAt.getTime() + selected[i].bufferMinutes * 60000) })), selected.map((event) => event.id), body.event.overrideReason, auth.isOwner);
      for (let i = 0; i < selected.length; i++) {
        const data = await eventData(tx, workspaceId, auth.ownerId, body.event, ranges[i].startsAt, ranges[i].endsAt);
        await tx.practiceEvent.update({ where: { id: selected[i].id }, data: { ...data, version: { increment: 1 } } });
      }
    } else {
      if (body.status === 'COMPLETED' || body.status === 'NO_SHOW') assertPractice(existing.startsAt <= new Date(), 400, 'Future events cannot be completed or marked as a no-show');
      await tx.practiceEvent.updateMany({ where: { id: { in: selected.map((event) => event.id) }, workspaceId }, data: { status: body.status, version: { increment: 1 } } });
      if (body.status === 'COMPLETED' && existing.billable) {
        const snapshot = existing.rateSnapshot as Record<string, Prisma.JsonValue>;
        await tx.practiceService.upsert({ where: { sourceKey: `event:${existing.id}` }, update: {}, create: {
          workspaceId, sourceKey: `event:${existing.id}`, eventId: existing.id, facilityId: existing.facilityId, patientId: existing.patientId,
          serviceCode: existing.serviceCode ?? 'CONSULTATION', description: existing.serviceCode ?? 'Clinical service', serviceDate: existing.startsAt,
          amountMinor: existing.feeMinor, coveredByRetainer: snapshot.coveredByRetainer === true, rateSnapshot: existing.rateSnapshot as Prisma.InputJsonValue,
        } });
      }
    }
    if (body.action === 'edit' || body.status === 'CANCELLED') {
      for (const event of selected) {
        await queueCalendarMessage(tx, event.id, body.action === 'edit' ? 'Your appointment has been rescheduled.' : 'Your appointment has been cancelled.', origin);
        await tx.practiceBookingRequest.updateMany({ where: { eventId: event.id }, data: { version: { increment: 1 }, ...(body.action === 'status' ? { status: 'CANCELLED' } : {}) } });
      }
    }
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: `CALENDAR_${body.action.toUpperCase()}`, entityId: eventId, context: { count: selected.length, scope: body.scope } } });
    return { ok: true, count: selected.length };
  });
}

export async function listPracticeEvents(actorId: string, workspaceId: string, from: Date, to: Date) {
  const auth = await authorizePracticeUser(actorId, workspaceId, 'calendar.read');
  assertPractice(to > from && to.getTime() - from.getTime() <= 366 * 86400000, 400, 'Choose a date range of up to one year');
  const events = await prisma.practiceEvent.findMany({ where: { workspaceId: auth.workspaceId, startsAt: { lt: to }, endsAt: { gt: from } }, include: { patient: { select: { id: true, name: true, patientCode: true, phone: true } }, facility: { select: { id: true, officialName: true } } }, orderBy: { startsAt: 'asc' } });
  return events.map(({ rateSnapshot: _rateSnapshot, ...event }) => event);
}
