import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '@/lib/db';
import { scanPracticeLegacy, reconcilePracticeLegacy, legacyKshToMinor } from '@/lib/practice-legacy';
import { practiceReport } from '@/lib/practice-reports';
const database = new URL(process.env.DATABASE_URL || 'postgresql://localhost/undefined');
assert.equal(database.pathname, '/pax_practice_test'); assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
process.env.PRACTICE_WORKSPACE_ENABLED = 'true';
test('legacy review preserves KSh meaning, source identity, duplicate decisions and unknown receipt dates', async () => {
  try {
    const suffix = randomUUID();
    const owner = await prisma.user.create({ data: { name: 'Legacy Owner', email: `${suffix}@example.test`, role: 'PRACTITIONER', tier: 'TIER2_PROFESSIONAL', hubMember: true } });
    const patient = await prisma.user.create({ data: { name: 'Legacy Patient', email: `patient-${suffix}@example.test`, role: 'PATIENT' } });
    const workspace = await prisma.practiceWorkspace.create({ data: { ownerId: owner.id } });
    const date = new Date();
    const appointment = await prisma.appointment.create({ data: { practitionerId: owner.id, patientId: patient.id, dateTime: date, status: 'COMPLETED', fee: 1500, billingRecord: { create: { amount: 1500, paymentStatus: 'PAID' } } }, include: { billingRecord: true } });
    const original = await prisma.invoice.create({ data: { practitionerId: owner.id, invoiceNumber: `LEGACY-${suffix}`, patientName: patient.name, serviceDate: date, serviceDesc: 'Consultation', totalAmount: 1500, status: 'PAID', payers: { create: { payerName: patient.name, amount: 1500, amountPaid: 1500, status: 'PAID' } } } });
    assert.equal(legacyKshToMinor(1500), 150000);
    assert.equal((await scanPracticeLegacy(owner.id, workspace.id)).staged, 2);
    assert.equal((await scanPracticeLegacy(owner.id, workspace.id)).staged, 0);
    assert.equal(await prisma.practiceEvent.count({ where: { legacyAppointmentId: appointment.id } }), 1);
    const staged = await prisma.practiceReconciliation.findMany({ where: { workspaceId: workspace.id } });
    const invoiceItem = staged.find((r) => r.kind === 'INVOICE')!, billItem = staged.find((r) => r.kind === 'BILLING')!;
    assert.ok((invoiceItem.snapshot as any).possibleDuplicates.length);
    await prisma.invoice.update({ where: { id: original.id }, data: { serviceDesc: 'Reconciled consultation description' } });
    await assert.rejects(reconcilePracticeLegacy(owner.id, workspace.id, { id: invoiceItem.id, decision: 'IMPORT', reason: 'Attempt import after source changed' }), /changed after staging/);
    await reconcilePracticeLegacy(owner.id, workspace.id, { id: invoiceItem.id, decision: 'REFRESH', reason: 'Refresh source after reviewing the original change' });
    await reconcilePracticeLegacy(owner.id, workspace.id, { id: invoiceItem.id, decision: 'IMPORT', reason: 'Original invoice confirmed against the source ledger' });
    await reconcilePracticeLegacy(owner.id, workspace.id, { id: billItem.id, decision: 'DUPLICATE', duplicateOf: invoiceItem.sourceKey, reason: 'This appointment fee is already included in the original invoice' });
    await assert.rejects(reconcilePracticeLegacy(owner.id, workspace.id, { id: invoiceItem.id, decision: 'IMPORT', reason: 'Retry should not create duplicates' }), /already changed/);
    const report = await practiceReport(owner.id, workspace.id, { from: new Date(date.getTime() - 86400000).toISOString(), to: new Date(date.getTime() + 86400000).toISOString() });
    assert.equal(report.totals.invoicedMinor, 150000); assert.equal(report.totals.cashReceivedMinor, 0); assert.equal(report.totals.unknownDateReceiptMinor, 150000); assert.equal(report.totals.outstandingMinor, 0); assert.equal(report.reconciliationCount, 0);
    assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: original.id } })).totalAmount, 1500);
  } finally { await prisma.$disconnect(); }
});
