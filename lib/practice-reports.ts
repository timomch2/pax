import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { assertPractice } from '@/lib/practice-policy';
import { adjustedResponsibility, approvedWithholding, roundedRatio } from '@/lib/practice-finance-math';

export const practiceReportSchema = z.object({
  from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }),
  facilityId: z.string().cuid().optional(), patientId: z.string().cuid().optional(), payerId: z.string().cuid().optional(),
  service: z.string().trim().max(160).optional(), method: z.enum(['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'CHEQUE', 'OTHER']).optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
}).strict().refine((r) => new Date(r.to) > new Date(r.from) && Date.parse(r.to) - Date.parse(r.from) <= 366 * 86400000, 'Choose a range of up to one year');

/** A report keeps dated activity separate from today's balances and never counts allocations as new receipts. */
export async function practiceReport(actorId: string, workspaceId: string, raw: unknown) {
  const filters = practiceReportSchema.parse(raw);
  const auth = await authorizePracticeUser(actorId, workspaceId, 'report.read');
  const from = new Date(filters.from), to = new Date(filters.to), now = new Date();
  const serviceFilter = { ...(filters.facilityId ? { facilityId: filters.facilityId } : {}), ...(filters.patientId ? { patientId: filters.patientId } : {}), ...(filters.service ? { serviceCode: filters.service } : {}) };
  return prisma.$transaction(async (tx) => {
    // Verify membership within the consistent report snapshot as well as at the API boundary.
    await authorizePracticeUser(actorId, workspaceId, 'report.read', tx);
    const [services, invoices, receipts, reconciliationCount] = await Promise.all([
      tx.practiceService.findMany({ where: { workspaceId, ...serviceFilter, serviceDate: { gte: from, lt: to } }, include: { invoiceLine: true }, orderBy: { serviceDate: 'asc' }, take: 10001 }),
      tx.practiceInvoice.findMany({ where: { workspaceId, ...(Object.keys(serviceFilter).length ? { lines: { some: { ...(filters.facilityId ? { facilityId: filters.facilityId } : {}), ...(filters.service ? { serviceCode: filters.service } : {}), ...(filters.patientId ? { service: { patientId: filters.patientId } } : {}) } } } : {}), ...(filters.payerId ? { payers: { some: { payerId: filters.payerId } } } : {}) }, include: { lines: true, adjustments: true, payers: { include: { payer: true, adjustments: true, allocations: { where: { reversedAt: null, receipt: { reversedAt: null } } } } } }, orderBy: { issuedAt: 'asc' }, take: 10001 }),
      tx.practiceReceipt.findMany({ where: { workspaceId, ...(filters.payerId ? { payerId: filters.payerId } : {}), ...(filters.method ? { method: filters.method } : {}) }, include: { payer: true, allocations: { include: { invoicePayer: { select: { invoiceId: true } } } }, adjustments: true }, orderBy: { receivedAt: 'asc' }, take: 10001 }),
      tx.practiceReconciliation.count({ where: { workspaceId, status: 'PENDING' } }),
    ]);
    assertPractice(services.length <= 10000 && invoices.length <= 10000 && receipts.length <= 10000, 400, 'This report exceeds 10,000 records. Narrow the filters.');
    const lineMatches = (line: { facilityId: string | null; serviceCode: string; patientReference: string | null; serviceId: string }) => (!filters.facilityId || line.facilityId === filters.facilityId) && (!filters.service || line.serviceCode === filters.service);
    // Patient scope is selected through source services, since issued documents preserve references rather than identities.
    const patientServiceIds = filters.patientId ? new Set((await tx.practiceService.findMany({ where: { workspaceId, patientId: filters.patientId }, select: { id: true } })).map((s) => s.id)) : null;
    const weight = new Map<string, { selected: number; total: number }>();
    const proportional = (amount: number, invoiceId: string) => { const w = weight.get(invoiceId); return w && w.total > 0 ? roundedRatio(amount, w.selected, w.total) : 0; };
    for (const invoice of invoices) weight.set(invoice.id, { selected: invoice.lines.filter((l) => lineMatches(l) && (!patientServiceIds || patientServiceIds.has(l.serviceId))).reduce((n, l) => n + l.amountMinor, 0), total: invoice.lines.reduce((n, l) => n + l.amountMinor, 0) });
    const rows: { type: string; date: string; reference: string; description: string; amountMinor: number; method: string }[] = [];
    const totals = { chargesMinor: 0, unbilledMinor: 0, invoicedMinor: 0, taxMinor: 0, cashReceivedMinor: 0, attributedCashMinor: 0, outstandingMinor: 0, creditMinor: 0, refundsMinor: 0, discountsMinor: 0, creditNotesMinor: 0, withholdingApprovedMinor: 0, withholdingPendingMinor: 0, unknownDateReceiptMinor: 0, receiptReversalsMinor: 0, voidedMinor: 0, taxAdjustmentsMinor: 0, netTaxMinor: 0 };
    const ageing = { notDueMinor: 0, days1to30Minor: 0, days31to60Minor: 0, days61to90Minor: 0, over90Minor: 0 };
    for (const service of services) {
      // Work without an invoice has no payer or payment method yet and remains explicitly unassigned.
      if (filters.payerId && (!service.invoiceLine || !invoices.some((i) => i.id === service.invoiceLine!.invoiceId))) continue;
      totals.chargesMinor += service.amountMinor;
      if (!service.invoiceLine && !service.coveredByRetainer) totals.unbilledMinor += service.amountMinor;
      rows.push({ type: service.coveredByRetainer ? 'COVERED_WORK' : service.invoiceLine ? 'CHARGE' : 'UNBILLED', date: service.serviceDate.toISOString(), reference: service.id, description: service.serviceCode, amountMinor: service.amountMinor, method: '' });
    }
    for (const invoice of invoices) {
      const selectedPayers = invoice.payers.filter((p) => !filters.payerId || p.payerId === filters.payerId);
      const payerShare = (amount: number) => filters.payerId ? roundedRatio(amount, selectedPayers.reduce((n, p) => n + p.amountMinor, 0), invoice.totalMinor) : amount;
      if (invoice.issuedAt >= from && invoice.issuedAt < to) {
        const amount = proportional(payerShare(invoice.totalMinor), invoice.id);
        totals.invoicedMinor += amount; totals.taxMinor += proportional(payerShare(invoice.taxMinor), invoice.id);
        rows.push({ type: 'INVOICE', date: invoice.issuedAt.toISOString(), reference: invoice.number, description: 'Issued clinical invoice', amountMinor: amount, method: '' });
      }
      for (const adjustment of invoice.adjustments.filter((a) => a.kind === 'VOID' && a.status === 'APPROVED' && a.reviewedAt && a.reviewedAt >= from && a.reviewedAt < to)) {
        const prior = invoice.payers.flatMap((p) => p.adjustments).filter((a) => a.status === 'APPROVED' && a.reviewedAt && a.reviewedAt <= adjustment.reviewedAt! && ['CREDIT_NOTE', 'DISCOUNT', 'CHARGE_INCREASE'].includes(a.kind));
        const remainingGross = invoice.totalMinor + prior.reduce((n, a) => n + (a.kind === 'CHARGE_INCREASE' ? 1 : -1) * a.amountMinor, 0);
        const remainingTax = invoice.taxMinor + prior.reduce((n, a) => n + (a.kind === 'CHARGE_INCREASE' ? 1 : -1) * a.taxMinor, 0);
        const selectedPrior = prior.filter((a) => !filters.payerId || selectedPayers.some((p) => p.id === a.invoicePayerId));
        const selectedGross = selectedPayers.reduce((n, p) => n + p.amountMinor, 0) + selectedPrior.reduce((n, a) => n + (a.kind === 'CHARGE_INCREASE' ? 1 : -1) * a.amountMinor, 0);
        const selectedTax = payerShare(invoice.taxMinor) + selectedPrior.reduce((n, a) => n + (a.kind === 'CHARGE_INCREASE' ? 1 : -1) * a.taxMinor, 0);
        const amount = proportional(filters.payerId ? selectedGross : remainingGross, invoice.id);
        totals.voidedMinor += amount; totals.taxAdjustmentsMinor -= proportional(filters.payerId ? selectedTax : remainingTax, invoice.id);
        rows.push({ type: 'VOID', date: adjustment.reviewedAt!.toISOString(), reference: invoice.number, description: adjustment.reason, amountMinor: -amount, method: '' });
      }
      for (const p of selectedPayers) {
        const current = invoice.status === 'VOID' ? 0 : Math.max(0, adjustedResponsibility(p.amountMinor, p.adjustments) - approvedWithholding(p.adjustments) - p.allocations.reduce((n, a) => n + a.amountMinor, 0));
        const balance = proportional(current, invoice.id); totals.outstandingMinor += balance;
        const days = p.dueAt ? Math.ceil((now.getTime() - p.dueAt.getTime()) / 86400000) : 0;
        const bucket = days <= 0 ? 'notDueMinor' : days <= 30 ? 'days1to30Minor' : days <= 60 ? 'days31to60Minor' : days <= 90 ? 'days61to90Minor' : 'over90Minor'; ageing[bucket] += balance;
        for (const a of p.adjustments) {
          if (a.kind === 'WITHHOLDING' && a.status === 'PENDING') totals.withholdingPendingMinor += proportional(a.amountMinor, invoice.id);
          if (a.status !== 'APPROVED' || !a.reviewedAt || a.reviewedAt < from || a.reviewedAt >= to) continue;
          const value = proportional(a.amountMinor, invoice.id);
          if (a.kind === 'DISCOUNT') totals.discountsMinor += value;
          if (a.kind === 'CREDIT_NOTE') totals.creditNotesMinor += value;
          if (a.kind === 'WITHHOLDING') totals.withholdingApprovedMinor += value;
          if (['DISCOUNT', 'CREDIT_NOTE', 'CHARGE_INCREASE'].includes(a.kind)) totals.taxAdjustmentsMinor += proportional(a.taxMinor, invoice.id) * (a.kind === 'CHARGE_INCREASE' ? 1 : -1);
          rows.push({ type: a.kind, date: a.reviewedAt.toISOString(), reference: invoice.number, description: a.reason, amountMinor: value, method: '' });
        }
      }
    }
    const dimensional = Boolean(filters.facilityId || filters.service || filters.patientId);
    for (const receipt of receipts) {
      const currentAllocations = receipt.allocations.filter((a) => !a.reversedAt);
      const allocated = currentAllocations.reduce((n, a) => n + a.amountMinor, 0);
      const refunds = receipt.adjustments.filter((a) => a.kind === 'REFUND' && a.status === 'APPROVED');
      const credit = receipt.amountMinor - allocated - refunds.reduce((n, a) => n + a.amountMinor, 0);
      const payerMatchesDimension = (!filters.facilityId || receipt.payer.facilityId === filters.facilityId) && (!filters.patientId || receipt.payer.patientId === filters.patientId) && !filters.service;
      if (!receipt.reversedAt && (!dimensional || payerMatchesDimension)) totals.creditMinor += credit;
      const attributable = receipt.allocations.filter((a) => !a.reversedAt || (receipt.reversedAt && a.reversedAt >= receipt.reversedAt)).reduce((n, a) => n + proportional(a.amountMinor, a.invoicePayer.invoiceId), 0);
      if (receipt.reversedAt && receipt.reversedAt >= from && receipt.reversedAt < to) {
        const value = dimensional ? attributable : receipt.amountMinor;
        totals.receiptReversalsMinor += value;
        if (value) rows.push({ type: 'RECEIPT_REVERSAL', date: receipt.reversedAt.toISOString(), reference: receipt.reference ?? receipt.id, description: receipt.payer.name, amountMinor: -value, method: receipt.method });
      }
      if (!receipt.dateKnown || !receipt.receivedAt) { if (!dimensional || attributable > 0 || payerMatchesDimension) totals.unknownDateReceiptMinor += dimensional ? attributable : receipt.amountMinor; continue; }
      if (receipt.receivedAt >= from && receipt.receivedAt < to) {
        if (!dimensional) totals.cashReceivedMinor += receipt.amountMinor;
        totals.attributedCashMinor += attributable;
        const value = dimensional ? attributable : receipt.amountMinor;
        if (value) rows.push({ type: dimensional ? 'ATTRIBUTED_RECEIPT' : 'RECEIPT', date: receipt.receivedAt.toISOString(), reference: receipt.reference ?? receipt.id, description: receipt.payer.name, amountMinor: value, method: receipt.method });
      }
      for (const refund of refunds) if (refund.occurredAt && refund.occurredAt >= from && refund.occurredAt < to && (!dimensional || payerMatchesDimension)) {
        totals.refundsMinor += refund.amountMinor;
        rows.push({ type: 'REFUND', date: refund.occurredAt.toISOString(), reference: receipt.reference ?? receipt.id, description: refund.reason, amountMinor: refund.amountMinor, method: receipt.method });
      }
    }
    // Statements use a signed account ledger: invoices debit; receipts and approved deductions credit.
    // Undated legacy settlements stay explicit rather than being assigned an invented historical date.
    const accountEntries: { date: string; type: string; reference: string; amountMinor: number }[] = [];
    const accountEntry = (date: Date, type: string, reference: string, amountMinor: number) => { if (date < to && amountMinor) accountEntries.push({ date: date.toISOString(), type, reference, amountMinor }); };
    let undatedSettlementMinor = 0;
    for (const invoice of invoices) {
      const payers = invoice.payers.filter((p) => !filters.payerId || p.payerId === filters.payerId);
      const share = (value: number) => proportional(filters.payerId ? roundedRatio(value, payers.reduce((n, p) => n + p.amountMinor, 0), invoice.totalMinor) : value, invoice.id);
      accountEntry(invoice.issuedAt, 'INVOICE', invoice.number, share(invoice.totalMinor));
      for (const payer of payers) for (const adjustment of payer.adjustments) {
        if (adjustment.status !== 'APPROVED' || !adjustment.reviewedAt || !['DISCOUNT', 'CREDIT_NOTE', 'CHARGE_INCREASE', 'WITHHOLDING'].includes(adjustment.kind)) continue;
        accountEntry(adjustment.reviewedAt, adjustment.kind, invoice.number, proportional(adjustment.amountMinor, invoice.id) * (adjustment.kind === 'CHARGE_INCREASE' ? 1 : -1));
      }
      for (const adjustment of invoice.adjustments.filter((a) => a.kind === 'VOID' && a.status === 'APPROVED' && a.reviewedAt)) {
        const remaining = invoice.totalMinor + invoice.payers.flatMap((p) => p.adjustments).filter((a) => a.status === 'APPROVED' && a.reviewedAt && a.reviewedAt <= adjustment.reviewedAt! && ['CREDIT_NOTE', 'DISCOUNT', 'CHARGE_INCREASE'].includes(a.kind)).reduce((n, a) => n + a.amountMinor * (a.kind === 'CHARGE_INCREASE' ? 1 : -1), 0);
        const selectedRemaining = payers.reduce((n, p) => n + adjustedResponsibility(p.amountMinor, p.adjustments.filter((a) => a.reviewedAt && a.reviewedAt <= adjustment.reviewedAt!)), 0);
        accountEntry(adjustment.reviewedAt!, 'VOID', invoice.number, -proportional(filters.payerId ? selectedRemaining : remaining, invoice.id));
      }
    }
    for (const receipt of receipts) {
      const relevantAllocations = receipt.allocations.filter((a) => !a.reversedAt || (receipt.reversedAt && a.reversedAt >= receipt.reversedAt));
      const amount = dimensional ? relevantAllocations.reduce((n, a) => n + proportional(a.amountMinor, a.invoicePayer.invoiceId), 0) : receipt.amountMinor;
      const reference = receipt.reference ?? receipt.id;
      if (receipt.dateKnown && receipt.receivedAt) accountEntry(receipt.receivedAt, 'RECEIPT', reference, -amount);
      else undatedSettlementMinor += amount;
      if (receipt.reversedAt) accountEntry(receipt.reversedAt, 'RECEIPT_REVERSAL', reference, amount);
      const matches = (!filters.facilityId || receipt.payer.facilityId === filters.facilityId) && (!filters.patientId || receipt.payer.patientId === filters.patientId) && !filters.service;
      for (const refund of receipt.adjustments.filter((a) => a.kind === 'REFUND' && a.status === 'APPROVED' && a.occurredAt)) if (!dimensional || matches) accountEntry(refund.occurredAt!, 'REFUND', reference, refund.amountMinor);
    }
    accountEntries.sort((a, b) => a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference));
    const openingMinor = accountEntries.filter((e) => new Date(e.date) < from).reduce((n, e) => n + e.amountMinor, 0);
    let runningMinor = openingMinor;
    const statementRows = accountEntries.filter((e) => new Date(e.date) >= from).map((entry) => ({ ...entry, balanceMinor: runningMinor += entry.amountMinor }));
    const statement = { openingMinor, closingDatedMinor: runningMinor, undatedSettlementMinor, closingIncludingUndatedMinor: runningMinor - undatedSettlementMinor, rows: statementRows, basis: 'Positive balance is owed; negative balance is credit. Opening and closing dated balances use known transaction dates. Undated legacy settlements are shown separately and are not a proven balance at the period end. Facility, patient, and service statements use current allocation attribution.' };
    totals.netTaxMinor = totals.taxMinor + totals.taxAdjustmentsMinor;
    return { statement, ownerName: auth.ownerName, filters, generatedAt: now.toISOString(), balanceBasis: 'Original receipts and invoices remain in dated activity; reversals and voids are shown separately on approval dates. Current balances; dated activity uses the selected period. Payment method filters cash and credits only. Facility/patient/service filters attribute cash through current invoice allocations; unapplied cash has no service attribution. Invoice-wide taxes are apportioned by service amount.', cashBasis: dimensional ? 'ATTRIBUTED_ALLOCATIONS' : 'RECEIPTS_ONCE', totals, ageing, reconciliationCount, rows: rows.sort((a, b) => a.date.localeCompare(b.date)) };
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 });
}

export function reportCsv(report: Awaited<ReturnType<typeof practiceReport>>) {
  const escape = (value: string | number) => { let text = String(value); if (!/^-?\d+(?:\.\d+)?$/.test(text) && /^\s*[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
  return '\uFEFF' + [['Report basis', report.balanceBasis], ['Statement basis', report.statement.basis], ...Object.entries(report.totals).map(([key, value]) => [key, (value / 100).toFixed(2)]), ['Opening dated balance (KSh)', (report.statement.openingMinor / 100).toFixed(2)], ['Closing dated balance (KSh)', (report.statement.closingDatedMinor / 100).toFixed(2)], ['Undated settlement (KSh)', (report.statement.undatedSettlementMinor / 100).toFixed(2)], [], ['Type', 'Date (UTC)', 'Reference', 'Description', 'Amount (KSh)', 'Payment method'], ...report.rows.map((r) => [r.type, r.date, r.reference, r.description, (r.amountMinor / 100).toFixed(2), r.method]), [], ['Statement type', 'Date (UTC)', 'Reference', 'Movement (KSh)', 'Dated balance (KSh)'], ...report.statement.rows.map((r) => [r.type, r.date, r.reference, (r.amountMinor / 100).toFixed(2), (r.balanceMinor / 100).toFixed(2)])].map((row) => row.map(escape).join(',')).join('\r\n');
}
