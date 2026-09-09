import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '@/lib/db';
import { publicSlots, saveAvailability, startBooking, confirmBookingToken, reviewBooking } from '@/lib/practice-bookings';
import { practiceDeliveryAllowed } from '@/lib/practice-delivery';
import { createPracticeEvents } from '@/lib/practice-calendar-service';
const database = new URL(process.env.DATABASE_URL || 'postgresql://localhost/undefined');
assert.equal(database.pathname, '/pax_practice_test'); assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
process.env.PRACTICE_WORKSPACE_ENABLED = 'true';
const origin = 'https://example.test';

test('public requests verify once, approval races reserve once, and stale email is suppressed', async () => {
  try {
    const suffix = randomUUID();
    const owner = await prisma.user.create({ data: { name: 'Booking Owner', email: `${suffix}@example.test`, role: 'PRACTITIONER', tier: 'TIER2_PROFESSIONAL', hubMember: true } });
    const workspace = await prisma.practiceWorkspace.create({ data: { ownerId: owner.id } });
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await assert.rejects(publicSlots(workspace.bookingSlug, date), /not currently/);
    await saveAvailability(owner.id, workspace.id, { action: 'rule', rule: { weekday: null, date, startMinute: 540, endMinute: 720, durationMinutes: 30, bufferMinutes: 10, facilityId: null, location: 'Online', appointmentType: 'Consultation', feeMinor: 5000 } });
    await saveAvailability(owner.id, workspace.id, { action: 'settings', bookingEnabled: true, remindersEnabled: true, appointmentReminderHours: 24, overdueReminderDays: [1, 7] });
    const slots = await publicSlots(workspace.bookingSlug, date);
    assert.equal(slots.slots.length, 3);
    const slot = slots.slots[0];
    const bookings = [];
    for (let i = 0; i < 2; i++) {
      const email = `patient-${i}-${suffix}@example.test`;
      await startBooking(workspace.bookingSlug, { email, name: `Request ${i}`, phone: null, availabilityId: slot.availabilityId, startsAt: slot.startsAt.toISOString() }, origin);
      const booking = await prisma.practiceBookingRequest.findFirstOrThrow({ where: { email } });
      const notice = await prisma.notificationEvent.findUniqueOrThrow({ where: { idempotencyKey: `practice:verify:${booking.id}` } });
      const token = String((notice.variables as any).verificationUrl).split('#')[1];
      assert.ok(await practiceDeliveryAllowed(notice.idempotencyKey, email));
      assert.equal((await confirmBookingToken(workspace.bookingSlug, { token }, origin)).status, 'PENDING');
      assert.equal(await practiceDeliveryAllowed(notice.idempotencyKey, email), false);
      await assert.rejects(confirmBookingToken(workspace.bookingSlug, { token }, origin), /already been used/);
      bookings.push(booking);
    }
    assert.equal((await publicSlots(workspace.bookingSlug, date)).slots.length, 3, 'Pending requests do not reserve');
    const raced = await Promise.allSettled(bookings.map((b) => reviewBooking(owner.id, workspace.id, { id: b.id, version: 2, action: 'APPROVE' }, origin)));
    assert.equal(raced.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(await prisma.practiceEvent.count({ where: { workspaceId: workspace.id } }), 1);
    assert.equal((await publicSlots(workspace.bookingSlug, date)).slots.length, 2);
    await assert.rejects(createPracticeEvents(owner.id, workspace.id, { kind: 'MEETING', title: 'Buffer clash', startsAt: new Date(slot.endsAt.getTime() + 60000).toISOString(), endsAt: new Date(slot.endsAt.getTime() + 300000).toISOString() }), /overlaps/);
    const approved = await prisma.practiceBookingRequest.findFirstOrThrow({ where: { workspaceId: workspace.id, status: 'APPROVED' } });
    assert.ok(await practiceDeliveryAllowed(`practice:booking:${approved.id}:${approved.version}`, approved.email));
    const pending = await prisma.practiceBookingRequest.findFirstOrThrow({ where: { workspaceId: workspace.id, status: 'PENDING' } });
    const alternate = (await publicSlots(workspace.bookingSlug, date)).slots[0];
    await reviewBooking(owner.id, workspace.id, { id: pending.id, version: pending.version, action: 'PROPOSE', startsAt: alternate.startsAt.toISOString(), availabilityId: alternate.availabilityId }, origin);
    const proposed = await prisma.practiceBookingRequest.findUniqueOrThrow({ where: { id: pending.id } });
    await assert.rejects(reviewBooking(owner.id, workspace.id, { id: pending.id, version: proposed.version, action: 'APPROVE' }, origin), /patient confirmation/);
    const proposalNotice = await prisma.notificationEvent.findUniqueOrThrow({ where: { idempotencyKey: `practice:booking:${pending.id}:${proposed.version}` } });
    const proposalToken = String((proposalNotice.variables as any).actionUrl).split('#')[1];
    assert.equal((await confirmBookingToken(workspace.bookingSlug, { token: proposalToken }, origin)).status, 'APPROVED');
    await assert.rejects(confirmBookingToken(workspace.bookingSlug, { token: proposalToken }, origin), /already been used/);
    assert.equal(await prisma.practiceEvent.count({ where: { workspaceId: workspace.id } }), 2);
    await prisma.user.update({ where: { id: owner.id }, data: { tier: 'TIER1_BASIC' } });
    assert.equal(await practiceDeliveryAllowed(`practice:booking:${approved.id}:${approved.version}`, approved.email), false);
    await assert.rejects(publicSlots(workspace.bookingSlug, date), /not currently/);
  } finally { await prisma.$disconnect(); }
});
