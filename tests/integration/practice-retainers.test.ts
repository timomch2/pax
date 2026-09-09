import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { createPracticeEvents, updatePracticeEvent } from '@/lib/practice-calendar-service';
import { generatePracticeRetainers, savePracticePayer, issuePracticeInvoice, recordPracticeReceipt, payerBalance } from '@/lib/practice-finance';
const database = new URL(process.env.DATABASE_URL || 'postgresql://localhost/undefined');
assert.equal(database.pathname, '/pax_practice_test'); assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
process.env.PRACTICE_WORKSPACE_ENABLED = 'true';

test('retainers cover selected work, generate once, and split invoices accept one bulk receipt', async () => {
  try {
    const suffix = randomUUID();
    const owner = await prisma.user.create({ data: { name: 'Retainer Owner', email: `${suffix}@example.test`, role: 'PRACTITIONER', tier: 'TIER2_PROFESSIONAL', hubMember: true } });
    const workspace = await prisma.practiceWorkspace.create({ data: { ownerId: owner.id } });
    const facility = await prisma.healthFacility.create({ data: { officialName: `Retainer Clinic ${suffix}`, normalizedName: `retainer clinic ${suffix}`, countryCode: 'KE', source: 'MANUAL' } });
    const start = new Date(Date.now() - 4 * 86400000);
    await prisma.consultingFacility.create({ data: { workspaceId: workspace.id, facilityId: facility.id, startsAt: new Date(start.getTime() - 86400000), rateType: 'MONTHLY', rateMinor: 100000, coveredServices: ['WARD_ROUND'] } });
    const covered = await createPracticeEvents(owner.id, workspace.id, { kind: 'CONSULTING', title: 'Covered ward round', facilityId: facility.id, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3600000).toISOString(), billable: true, serviceCode: 'WARD_ROUND', feeMinor: 20000 });
    await updatePracticeEvent(owner.id, workspace.id, covered.ids[0], { action: 'status', status: 'COMPLETED', version: 1 });
    const coveredService = await prisma.practiceService.findUniqueOrThrow({ where: { eventId: covered.ids[0] } });
    assert.equal(coveredService.amountMinor, 0); assert.equal(coveredService.coveredByRetainer, true);
    const uncoveredStart = new Date(start.getTime() + 86400000);
    const uncovered = await createPracticeEvents(owner.id, workspace.id, { kind: 'CONSULTING', title: 'Uncovered clinical session', facilityId: facility.id, startsAt: uncoveredStart.toISOString(), endsAt: new Date(uncoveredStart.getTime() + 3600000).toISOString(), billable: true, serviceCode: 'SPECIAL_SESSION', feeMinor: 20000 });
    await updatePracticeEvent(owner.id, workspace.id, uncovered.ids[0], { action: 'status', status: 'COMPLETED', version: 1 });
    const month = new Date(Date.now() + 10800000).toISOString().slice(0, 7);
    await Promise.all([generatePracticeRetainers(owner.id, workspace.id, { month }), generatePracticeRetainers(owner.id, workspace.id, { month })]);
    const services = await prisma.practiceService.findMany({ where: { workspaceId: workspace.id, coveredByRetainer: false }, orderBy: { amountMinor: 'desc' } });
    assert.equal(services.length, 2); assert.deepEqual(services.map((s) => s.amountMinor), [100000, 20000]);
    const payer = await savePracticePayer(owner.id, workspace.id, { kind: 'FACILITY', facilityId: facility.id, name: facility.officialName });
    const sponsor = await savePracticePayer(owner.id, workspace.id, { kind: 'NGO_DONOR', name: 'Clinical sponsor' });
    const first = await issuePracticeInvoice(owner.id, workspace.id, { requestKey: randomUUID(), serviceIds: [services[0].id], payers: [{ payerId: payer.id, amountMinor: 70000 }, { payerId: sponsor.id, amountMinor: 30000 }] });
    const second = await issuePracticeInvoice(owner.id, workspace.id, { requestKey: randomUUID(), serviceIds: [services[1].id], payers: [{ payerId: payer.id, amountMinor: 20000 }] });
    const lines = await prisma.practiceInvoicePayer.findMany({ where: { invoiceId: { in: [first.id, second.id] }, payerId: payer.id } });
    await recordPracticeReceipt(owner.id, workspace.id, { requestKey: randomUUID(), payerId: payer.id, amountMinor: 90000, receivedAt: new Date().toISOString(), method: 'BANK_TRANSFER', allocations: lines.map((line) => ({ invoicePayerId: line.id, amountMinor: line.amountMinor })) });
    for (const line of lines) assert.equal((await payerBalance(prisma, line.id, workspace.id)).outstandingMinor, 0);
    const sponsorLine = await prisma.practiceInvoicePayer.findFirstOrThrow({ where: { invoiceId: first.id, payerId: sponsor.id } });
    assert.equal((await payerBalance(prisma, sponsorLine.id, workspace.id)).outstandingMinor, 30000);
  } finally { await prisma.$disconnect(); }
});
