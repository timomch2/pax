import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '@/lib/db';
import { enqueueNotification } from '@/lib/notification-service';
import { processNotificationBatch } from '@/lib/notification-worker';
import { practiceDeliveryAllowed } from '@/lib/practice-delivery';
const database = new URL(process.env.DATABASE_URL || 'postgresql://localhost/undefined');
assert.equal(database.pathname, '/pax_practice_test'); assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
process.env.PRACTICE_WORKSPACE_ENABLED = 'true';
test('missing email configuration records a failed delivery and retry; cancellation suppresses stale reminders', async () => {
  const old = process.env.ABACUSAI_API_KEY; process.env.ABACUSAI_API_KEY = '';
  try {
    const suffix = randomUUID(), email = `delivery-${suffix}@example.test`;
    const owner = await prisma.user.create({ data: { name: 'Delivery Owner', email: `owner-${email}`, role: 'PRACTITIONER', tier: 'TIER2_PROFESSIONAL', hubMember: true } });
    const workspace = await prisma.practiceWorkspace.create({ data: { ownerId: owner.id } });
    const patient = await prisma.hubPatient.create({ data: { practitionerId: owner.id, name: 'Delivery Patient', email, patientCode: `TEST-${suffix}` } });
    const event = await prisma.practiceEvent.create({ data: { workspaceId: workspace.id, patientId: patient.id, kind: 'APPOINTMENT', title: 'Appointment', startsAt: new Date(Date.now() + 3600000), endsAt: new Date(Date.now() + 5400000), createdById: owner.id } });
    const key = `practice:reminder:${event.id}:1`;
    const notice = await enqueueNotification(prisma, { templateSlug: 'practice.appointment-reminder', recipient: email, variables: { time: 'Tomorrow', actionUrl: 'https://example.test' }, idempotencyKey: key, priority: 1000000 });
    assert.ok(await practiceDeliveryAllowed(key, email));
    await processNotificationBatch(1);
    const failed = await prisma.notificationEvent.findUniqueOrThrow({ where: { id: notice.id }, include: { deliveries: true } });
    assert.equal(failed.status, 'RETRY'); assert.equal(failed.deliveries[0].status, 'FAILED'); assert.match(failed.lastError ?? '', /configuration is incomplete/); assert.equal(failed.deliveries[0].sentAt, null);
    await prisma.practiceEvent.update({ where: { id: event.id }, data: { status: 'CANCELLED', version: { increment: 1 } } });
    assert.equal(await practiceDeliveryAllowed(key, email), false);
    await prisma.notificationEvent.update({ where: { id: notice.id }, data: { availableAt: new Date(Date.now() - 1000) } });
    await processNotificationBatch(1);
    const skipped = await prisma.notificationEvent.findUniqueOrThrow({ where: { id: notice.id }, include: { deliveries: true } });
    assert.equal(skipped.status, 'COMPLETED'); assert.equal(skipped.deliveries[0].status, 'SKIPPED'); assert.equal(skipped.deliveries[0].sentAt, null);
  } finally { if (old === undefined) delete process.env.ABACUSAI_API_KEY; else process.env.ABACUSAI_API_KEY = old; await prisma.$disconnect(); }
});
