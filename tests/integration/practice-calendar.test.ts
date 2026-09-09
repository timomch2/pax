import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '@/lib/db';
import { createPracticeEvents, listPracticeEvents, updatePracticeEvent } from '@/lib/practice-calendar-service';
import { savePracticePatient, readPracticeNotes, listPracticePatients } from '@/lib/practice-patients';

const database = new URL(process.env.DATABASE_URL || 'postgresql://localhost/undefined');
assert.equal(database.pathname, '/pax_practice_test');
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
process.env.PRACTICE_WORKSPACE_ENABLED = 'true';

test('calendar transactions enforce ownership, clashes, protected history and one-time service creation', async () => {
  const suffix = randomUUID();
  try {
    const owner = await prisma.user.create({ data: { name: 'Calendar Owner', email: `${suffix}@example.test`, role: 'PRACTITIONER', tier: 'TIER2_PROFESSIONAL', hubMember: true } });
    const workspace = await prisma.practiceWorkspace.create({ data: { ownerId: owner.id } });
    const receptionist = await prisma.user.create({ data: { name: 'Reception', email: `reception-${suffix}@example.test`, role: 'STAFF' } });
    await prisma.practiceMember.create({ data: { workspaceId: workspace.id, userId: receptionist.id, roles: ['RECEPTION'] } });
    const saved = await savePracticePatient(receptionist.id, workspace.id, { name: 'Test Patient', phone: '0700000000' });
    assert.ok(saved.patient);
    const patientId = saved.patient!.id;
    await prisma.hubPatient.update({ where: { id: patientId }, data: { notes: 'Private original clinical note' } });
    const patients = await listPracticePatients(receptionist.id, workspace.id, 'Test Patient');
    assert.ok(!JSON.stringify(patients).includes('Private original clinical note'));
    await assert.rejects(readPracticeNotes(receptionist.id, workspace.id, patientId), /access/);
    const start = new Date(Date.now() - 10 * 86400000), end = new Date(start.getTime() + 3600000);
    const meeting = { kind: 'MEETING', title: 'Professional meeting', startsAt: start.toISOString(), endsAt: end.toISOString() };
    const raced = await Promise.allSettled([createPracticeEvents(owner.id, workspace.id, meeting), createPracticeEvents(owner.id, workspace.id, meeting)]);
    assert.equal(raced.filter((row) => row.status === 'fulfilled').length, 1);
    await assert.rejects(createPracticeEvents(receptionist.id, workspace.id, { ...meeting, overrideReason: 'Intentional overlap' }), /Only the practitioner/);
    const override = await createPracticeEvents(owner.id, workspace.id, { ...meeting, overrideReason: 'Intentional overlap for test' });
    assert.equal(override.ids.length, 1);
    const nextStart = new Date(start.getTime() + 86400000), nextEnd = new Date(end.getTime() + 86400000);
    const appointment = await createPracticeEvents(receptionist.id, workspace.id, { ...meeting, kind: 'APPOINTMENT', title: 'Follow-up', patientId, startsAt: nextStart.toISOString(), endsAt: nextEnd.toISOString(), billable: true, serviceCode: 'CONSULTATION', feeMinor: 12345 });
    await updatePracticeEvent(receptionist.id, workspace.id, appointment.ids[0], { action: 'status', version: 1, status: 'COMPLETED' });
    assert.equal((await prisma.practiceService.findUniqueOrThrow({ where: { eventId: appointment.ids[0] } })).amountMinor, 12345);
    await assert.rejects(updatePracticeEvent(receptionist.id, workspace.id, appointment.ids[0], { action: 'status', version: 1, status: 'COMPLETED' }), /changed/);
    assert.equal(await prisma.practiceService.count({ where: { eventId: appointment.ids[0] } }), 1);
    await assert.rejects(updatePracticeEvent(owner.id, workspace.id, appointment.ids[0], { action: 'edit', version: 2, event: meeting }), /preserved/);
    const visible = await listPracticeEvents(receptionist.id, workspace.id, start, new Date(end.getTime() + 3 * 86400000));
    assert.ok(visible.every((row) => !('rateSnapshot' in row)));
    const duplicate = await savePracticePatient(owner.id, workspace.id, { name: 'Test Patient' });
    assert.equal(duplicate.requiresReview, true);
    const futureStart = new Date(Date.now() + 86400000);
    const future = await createPracticeEvents(owner.id, workspace.id, { ...meeting, startsAt: futureStart.toISOString(), endsAt: new Date(futureStart.getTime() + 3600000).toISOString(), recurrence: { frequency: 'WEEKLY', until: new Date(futureStart.getTime() + 14 * 86400000).toISOString() } });
    assert.equal(future.ids.length, 3);
    const secondStart = new Date(futureStart.getTime() + 7 * 86400000 + 3600000);
    await updatePracticeEvent(owner.id, workspace.id, future.ids[1], { action: 'edit', version: 1, scope: 'FUTURE', event: { ...meeting, startsAt: secondStart.toISOString(), endsAt: new Date(secondStart.getTime() + 3600000).toISOString() } });
    const shifted = await prisma.practiceEvent.findMany({ where: { id: { in: future.ids } }, orderBy: { startsAt: 'asc' } });
    assert.equal(shifted[0].startsAt.getTime(), futureStart.getTime());
    assert.equal(shifted[1].startsAt.getTime(), secondStart.getTime());
    assert.equal(shifted[2].startsAt.getTime(), secondStart.getTime() + 7 * 86400000);
    await updatePracticeEvent(owner.id, workspace.id, future.ids[1], { action: 'status', version: 2, status: 'CANCELLED', scope: 'FUTURE' });
    assert.equal(await prisma.practiceEvent.count({ where: { id: { in: future.ids }, status: 'CANCELLED' } }), 2);
    assert.equal(await prisma.practiceService.count({ where: { eventId: { in: future.ids } } }), 0);
  } finally { await prisma.$disconnect(); }
});
