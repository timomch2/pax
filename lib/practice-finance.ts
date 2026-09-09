import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { assertPractice, type PracticeAction } from '@/lib/practice-policy';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';
import { clinicalInvoiceTotals, adjustedResponsibility, approvedWithholding, checkedMinor, roundedRatio } from '@/lib/practice-finance-math';

type Db = Prisma.TransactionClient;
const minor = z.number().int().nonnegative().max(2000000000);
const requestKey = z.string().min(10).max(120);
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const paymentMethod = z.enum(['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'CHEQUE', 'OTHER']);

async function financeWrite<T>(actorId: string, workspaceId: string, action: PracticeAction, work: (tx: Db, ownerId: string) => Promise<T>) {
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId);
    const auth = await authorizePracticeUser(actorId, workspaceId, action, tx);
    return work(tx, auth.ownerId);
  });
}

export async function payerBalance(tx: Db, invoicePayerId: string, workspaceId: string) {
  const line = await tx.practiceInvoicePayer.findFirst({ where: { id: invoicePayerId, invoice: { workspaceId } }, include: {
    invoice: true, adjustments: true, allocations: { where: { reversedAt: null, receipt: { reversedAt: null } } },
  } });
  assertPractice(line, 404, 'Invoice payer not found');
  const responsibilityMinor = line.invoice.status === 'VOID' ? 0 : adjustedResponsibility(line.amountMinor, line.adjustments);
  const cashMinor = line.allocations.reduce((sum, row) => sum + row.amountMinor, 0);
  const withholdingMinor = approvedWithholding(line.adjustments);
  return { line, responsibilityMinor, cashMinor, withholdingMinor, outstandingMinor: Math.max(0, responsibilityMinor - cashMinor - withholdingMinor) };
}

export async function receiptBalance(tx: Db, receiptId: string, workspaceId: string) {
  const receipt = await tx.practiceReceipt.findFirst({ where: { id: receiptId, workspaceId }, include: { allocations: { where: { reversedAt: null } }, adjustments: { where: { kind: 'REFUND', status: 'APPROVED' } } } });
  assertPractice(receipt, 404, 'Receipt not found');
  const allocatedMinor = receipt.allocations.reduce((sum, row) => sum + row.amountMinor, 0);
  const refundedMinor = receipt.adjustments.reduce((sum, row) => sum + row.amountMinor, 0);
  return { receipt, allocatedMinor, refundedMinor, availableMinor: receipt.reversedAt ? 0 : receipt.amountMinor - allocatedMinor - refundedMinor };
}

export async function savePracticePayer(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ remindersEnabled: z.boolean().default(true), kind: z.enum(['FACILITY', 'PATIENT', 'INSURER', 'EMPLOYER', 'SHA_NHIF', 'NGO_DONOR', 'OTHER']), name: z.string().trim().min(2).max(200), facilityId: z.string().cuid().nullable().default(null), patientId: z.string().cuid().nullable().default(null), email: z.string().trim().email().transform((email) => email.toLowerCase()).nullable().default(null), phone: z.string().trim().max(40).nullable().default(null) }).strict().parse(raw);
  return financeWrite(actorId, workspaceId, 'billing.manage', async (tx, ownerId) => {
    assertPractice((body.kind === 'FACILITY') === Boolean(body.facilityId), 400, 'Facility payers must select a facility');
    assertPractice((body.kind === 'PATIENT') === Boolean(body.patientId), 400, 'Patient payers must select a patient');
    let name = body.name;
    if (body.facilityId) {
      const relationship = await tx.consultingFacility.findFirst({ where: { workspaceId, facilityId: body.facilityId }, include: { facility: true } });
      assertPractice(relationship, 404, 'Consulting facility not found'); name = relationship.facility.officialName;
    }
    if (body.patientId) {
      const patient = await tx.hubPatient.findFirst({ where: { id: body.patientId, practitionerId: ownerId } });
      assertPractice(patient, 404, 'Patient not found'); name = patient.name;
    }
    const identityKey = `${body.kind}:${body.facilityId ?? body.patientId ?? name.toLowerCase().replace(/\s+/g, ' ')}`;
    return tx.practicePayer.upsert({ where: { workspaceId_identityKey: { workspaceId, identityKey } }, create: { ...body, name, workspaceId, identityKey }, update: { email: body.email, phone: body.phone, remindersEnabled: body.remindersEnabled } });
  });
}

export async function savePracticeTaxRate(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ id: z.string().cuid().optional(), name: z.string().trim().min(2).max(100), kind: z.enum(['TAX', 'WITHHOLDING']), rateBps: z.number().int().min(0).max(10000), inclusive: z.boolean().default(false), base: z.enum(['NET', 'GROSS']).default('NET'), active: z.boolean().default(true) }).strict().parse(raw);
  assertPractice(!(body.kind === 'TAX' && !body.inclusive && body.base === 'GROSS' && body.rateBps === 10000), 400, 'Exclusive gross-base tax must be below 100%');
  return financeWrite(actorId, workspaceId, 'billing.manage', async (tx) => {
    const { id, ...fields } = body;
    if (id) assertPractice(await tx.practiceTaxRate.findFirst({ where: { id, workspaceId }, select: { id: true } }), 404, 'Rate not found');
    const rate = id ? await tx.practiceTaxRate.update({ where: { id }, data: fields }) : await tx.practiceTaxRate.create({ data: { ...fields, workspaceId } });
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'TAX_CONFIGURATION_SAVED', entityId: rate.id } });
    return rate;
  });
}

export async function issuePracticeInvoice(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ requestKey, serviceIds: z.array(z.string().cuid()).min(1).max(200), includePatientNames: z.boolean().default(false), taxRateId: z.string().cuid().nullable().default(null), withholdingRateId: z.string().cuid().nullable().default(null), payers: z.array(z.object({ payerId: z.string().cuid(), amountMinor: minor.positive(), dueAt: z.string().datetime({ offset: true }).nullable().default(null) }).strict()).min(1).max(20) }).strict().parse(raw);
  assertPractice(new Set(body.serviceIds).size === body.serviceIds.length && new Set(body.payers.map((line) => line.payerId)).size === body.payers.length, 400, 'Select each service and payer once');
  return financeWrite(actorId, workspaceId, 'billing.manage', async (tx, ownerId) => {
    const sourceKey = `${workspaceId}:invoice:${body.requestKey}`, requestHash = digest(body);
    const prior = await tx.practiceInvoice.findUnique({ where: { sourceKey } });
    if (prior) { assertPractice(prior.requestHash === requestHash, 409, 'Request key was already used for a different invoice'); return prior; }
    const services = await tx.practiceService.findMany({ where: { id: { in: body.serviceIds }, workspaceId }, include: { invoiceLine: true, patient: true, facility: true } });
    assertPractice(services.length === body.serviceIds.length && services.every((row) => !row.invoiceLine && !row.coveredByRetainer), 409, 'Some services are already billed, covered by a retainer, or unavailable');
    const rate = async (id: string | null, kind: string) => {
      if (!id) return null;
      const found = await tx.practiceTaxRate.findFirst({ where: { id, workspaceId, kind, active: true } });
      assertPractice(found, 404, 'Configured rate not found'); return found;
    };
    const tax = await rate(body.taxRateId, 'TAX'), withholding = await rate(body.withholdingRateId, 'WITHHOLDING');
    const totals = clinicalInvoiceTotals(services.map((row) => row.amountMinor), tax, withholding);
    assertPractice(totals.totalMinor > 0 && body.payers.reduce((sum, line) => sum + line.amountMinor, 0) === totals.totalMinor, 400, 'Payer allocations must equal the invoice total including tax');
    const payerRows = await tx.practicePayer.findMany({ where: { id: { in: body.payers.map((line) => line.payerId) }, workspaceId } });
    assertPractice(payerRows.length === body.payers.length, 404, 'Payer not found');
    for (const payer of payerRows) {
      if (payer.patientId) assertPractice(services.every((row) => row.patientId === payer.patientId), 400, 'A patient payer cannot pay for unrelated patient services on this invoice');
      if (payer.facilityId) assertPractice(services.every((row) => row.facilityId === payer.facilityId), 400, 'A facility invoice can only include work for that facility');
    }
    const now = new Date(), year = Number(new Intl.DateTimeFormat('en-KE', { year: 'numeric', timeZone: 'Africa/Nairobi' }).format(now));
    const sequence = await tx.invoiceSequence.upsert({ where: { practitionerId_year: { practitionerId: ownerId, year } }, create: { practitionerId: ownerId, year, nextValue: 2 }, update: { nextValue: { increment: 1 } } });
    const number = `PAX-${year}-${workspaceId.slice(-8).toUpperCase()}-${String(sequence.nextValue - 1).padStart(6, '0')}`;
    const invoice = await tx.practiceInvoice.create({ data: {
      workspaceId, sourceKey, requestHash, number, ...totals, includePatientNames: body.includePatientNames, createdById: actorId,
      taxSnapshot: { tax: tax ? { name: tax.name, rateBps: tax.rateBps, inclusive: tax.inclusive, base: tax.base } : null, withholding: withholding ? { name: withholding.name, rateBps: withholding.rateBps, base: withholding.base } : null },
      facilitySnapshot: services.filter((row) => row.facility).map((row) => ({ id: row.facility!.id, name: row.facility!.officialName, country: row.facility!.countryCode, county: row.facility!.county, town: row.facility!.town, fidCode: row.facility!.fidCode })),
      lines: { create: services.map((row) => ({ serviceId: row.id, description: row.description, serviceCode: row.serviceCode, serviceDate: row.serviceDate, amountMinor: row.amountMinor, facilityId: row.facilityId, patientReference: row.patient?.patientRef ?? row.patient?.patientCode, patientName: body.includePatientNames ? row.patient?.name : null })) },
      payers: { create: body.payers.map((line) => { const payer = payerRows.find((row) => row.id === line.payerId)!; return { ...line, payerSnapshot: { name: payer.name, kind: payer.kind, email: payer.email, phone: payer.phone } }; }) },
    } });
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'INVOICE_ISSUED', entityId: invoice.id } });
    return invoice;
  });
}

const allocationSchema = z.array(z.object({ invoicePayerId: z.string().cuid(), amountMinor: minor.positive() }).strict()).max(200).refine((rows) => new Set(rows.map((row) => row.invoicePayerId)).size === rows.length, 'Allocate once per invoice payer');

async function allocateReceipt(tx: Db, workspaceId: string, receiptId: string, allocations: z.infer<typeof allocationSchema>, key: string) {
  const balance = await receiptBalance(tx, receiptId, workspaceId);
  assertPractice(!balance.receipt.reversedAt, 409, 'Receipt is reversed');
  const sum = allocations.reduce((total, row) => total + row.amountMinor, 0);
  assertPractice(sum <= balance.availableMinor, 400, 'Allocations exceed available receipt credit');
  for (const allocation of allocations) {
    const payer = await payerBalance(tx, allocation.invoicePayerId, workspaceId);
    assertPractice(payer.line.payerId === balance.receipt.payerId, 400, 'Credit cannot be allocated to a different payer');
    assertPractice(payer.line.invoice.status !== 'VOID' && allocation.amountMinor <= payer.outstandingMinor, 400, 'Allocation exceeds the invoice balance');
    await tx.practiceReceiptAllocation.create({ data: { ...allocation, receiptId, sourceKey: `${key}:${allocation.invoicePayerId}` } });
  }
}

export async function recordPracticeReceipt(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ requestKey, payerId: z.string().cuid(), amountMinor: minor.positive(), receivedAt: z.string().datetime({ offset: true }), method: paymentMethod, reference: z.string().trim().max(200).nullable().default(null), allocations: allocationSchema.default([]) }).strict().parse(raw);
  assertPractice(new Date(body.receivedAt) <= new Date(), 400, 'Received date cannot be in the future');
  return financeWrite(actorId, workspaceId, 'billing.manage', async (tx) => {
    const sourceKey = `${workspaceId}:receipt:${body.requestKey}`, requestHash = digest(body);
    const prior = await tx.practiceReceipt.findUnique({ where: { sourceKey } });
    if (prior) { assertPractice(prior.requestHash === requestHash, 409, 'Request key was already used for another receipt'); return prior; }
    assertPractice(await tx.practicePayer.findFirst({ where: { id: body.payerId, workspaceId }, select: { id: true } }), 404, 'Payer not found');
    const receipt = await tx.practiceReceipt.create({ data: { workspaceId, sourceKey, requestHash, payerId: body.payerId, amountMinor: body.amountMinor, receivedAt: new Date(body.receivedAt), method: body.method, reference: body.reference, recordedById: actorId } });
    await allocateReceipt(tx, workspaceId, receipt.id, body.allocations, sourceKey);
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'RECEIPT_RECORDED', entityId: receipt.id } });
    return receipt;
  });
}

export async function allocatePracticeCredit(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ receiptId: z.string().cuid(), requestKey, allocations: allocationSchema.refine((rows) => rows.length > 0) }).strict().parse(raw);
  return financeWrite(actorId, workspaceId, 'billing.manage', async (tx) => {
    const key = `${workspaceId}:allocation:${body.requestKey}`;
    const previous = await tx.practiceAuditEvent.findFirst({ where: { workspaceId, action: 'CREDIT_ALLOCATED', entityId: key } });
    if (previous) { assertPractice((previous.context as Record<string, unknown>)?.hash === digest(body), 409, 'Request key was already used for another allocation'); return { ok: true }; }
    await allocateReceipt(tx, workspaceId, body.receiptId, body.allocations, key);
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'CREDIT_ALLOCATED', entityId: key, context: { hash: digest(body), receiptId: body.receiptId } } });
    return { ok: true };
  });
}

export async function proposePracticeAdjustment(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ requestKey, kind: z.enum(['CREDIT_NOTE', 'DISCOUNT', 'CHARGE_INCREASE', 'REFUND', 'VOID', 'RECEIPT_REVERSAL', 'WITHHOLDING']), invoicePayerId: z.string().cuid().nullable().default(null), invoiceId: z.string().cuid().nullable().default(null), receiptId: z.string().cuid().nullable().default(null), amountMinor: minor.default(0), reason: z.string().trim().min(5).max(2000), evidenceReference: z.string().trim().min(3).max(500).nullable().default(null), occurredAt: z.string().datetime({ offset: true }).nullable().default(null) }).strict().parse(raw);
  return financeWrite(actorId, workspaceId, 'billing.manage', async (tx) => {
    const sourceKey = `${workspaceId}:adjustment:${body.requestKey}`, requestHash = digest(body);
    const prior = await tx.practiceAdjustment.findUnique({ where: { sourceKey } });
    if (prior) { assertPractice(prior.requestHash === requestHash, 409, 'Request key already used'); return prior; }
    const payerKinds = ['CREDIT_NOTE', 'DISCOUNT', 'CHARGE_INCREASE', 'WITHHOLDING'];
    const receiptKinds = ['REFUND', 'RECEIPT_REVERSAL'];
    assertPractice(payerKinds.includes(body.kind) === Boolean(body.invoicePayerId), 400, 'Choose an invoice payer for this adjustment');
    assertPractice(receiptKinds.includes(body.kind) === Boolean(body.receiptId), 400, 'Choose a receipt for this adjustment');
    assertPractice((body.kind === 'VOID') === Boolean(body.invoiceId), 400, 'Choose an invoice only for voiding');
    if (body.kind === 'WITHHOLDING') assertPractice(body.evidenceReference, 400, 'Record the withholding reference or certificate reference');
    if (body.kind === 'REFUND') assertPractice(body.occurredAt && new Date(body.occurredAt) <= new Date(), 400, 'Record when the refund was returned externally');
    if (!['VOID', 'RECEIPT_REVERSAL'].includes(body.kind)) assertPractice(body.amountMinor > 0, 400, 'Enter a positive amount');
    let invoiceId = body.invoiceId;
    if (body.invoicePayerId) invoiceId = (await payerBalance(tx, body.invoicePayerId, workspaceId)).line.invoiceId;
    if (body.receiptId) await receiptBalance(tx, body.receiptId, workspaceId);
    if (body.invoiceId) assertPractice(await tx.practiceInvoice.findFirst({ where: { id: body.invoiceId, workspaceId }, select: { id: true } }), 404, 'Invoice not found');
    const { requestKey: _key, ...fields } = body;
    const adjustment = await tx.practiceAdjustment.create({ data: { ...fields, invoiceId, workspaceId, sourceKey, requestHash, proposedById: actorId } });
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'ADJUSTMENT_PROPOSED', entityId: adjustment.id } });
    return adjustment;
  });
}

/** Release overallocated funds as payer credit without erasing the original allocation. */
async function releaseCredit(tx: Db, workspaceId: string, invoicePayerId: string, amount: number, sourceKey: string) {
  const balance = await payerBalance(tx, invoicePayerId, workspaceId);
  let remaining = amount;
  for (const allocation of [...balance.line.allocations].reverse()) {
    if (remaining <= 0) break;
    const released = Math.min(remaining, allocation.amountMinor);
    await tx.practiceReceiptAllocation.update({ where: { id: allocation.id }, data: { reversedAt: new Date() } });
    if (released < allocation.amountMinor) await tx.practiceReceiptAllocation.create({ data: { receiptId: allocation.receiptId, invoicePayerId, amountMinor: allocation.amountMinor - released, sourceKey: `${sourceKey}:release:${allocation.id}` } });
    remaining -= released;
  }
  assertPractice(remaining === 0, 409, 'Could not release the allocated credit');
}

export async function reviewPracticeAdjustment(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ id: z.string().cuid(), decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string().trim().min(5).max(2000) }).strict().parse(raw);
  return financeWrite(actorId, workspaceId, 'billing.approve', async (tx) => {
    const adjustment = await tx.practiceAdjustment.findFirst({ where: { id: body.id, workspaceId } });
    assertPractice(adjustment?.status === 'PENDING', 409, 'Adjustment is no longer pending');
    let netMinor = 0, taxMinor = 0;
    if (body.decision === 'APPROVED') {
      if (adjustment.invoicePayerId) {
        const balance = await payerBalance(tx, adjustment.invoicePayerId, workspaceId);
        assertPractice(balance.line.invoice.status !== 'VOID', 409, 'Invoice is void');
        if (adjustment.kind === 'WITHHOLDING') {
          const previous = await tx.practiceAdjustment.findMany({ where: { invoiceId: balance.line.invoiceId, status: 'APPROVED' } });
          let adjustedNet = balance.line.invoice.netMinor, adjustedGross = balance.line.invoice.totalMinor;
          for (const change of previous) if (['CHARGE_INCREASE', 'CREDIT_NOTE', 'DISCOUNT'].includes(change.kind)) { const direction = change.kind === 'CHARGE_INCREASE' ? 1 : -1; adjustedNet += direction * change.netMinor; adjustedGross += direction * change.amountMinor; }
          const configured = (balance.line.invoice.taxSnapshot as any)?.withholding;
          const maximum = configured ? roundedRatio(configured.base === 'GROSS' ? adjustedGross : adjustedNet, configured.rateBps, 10000) : 0;
          const approved = approvedWithholding(previous);
          assertPractice(adjustment.evidenceReference && adjustment.amountMinor <= balance.outstandingMinor && adjustment.amountMinor + approved <= maximum, 400, 'Withholding exceeds the discounted invoice balance or configured withholding amount');
        } else {
          if (['CREDIT_NOTE', 'DISCOUNT'].includes(adjustment.kind)) {
            assertPractice(adjustment.amountMinor <= balance.responsibilityMinor - balance.withholdingMinor, 400, 'Credit exceeds the remaining payer responsibility');
            const excess = Math.max(0, balance.cashMinor + balance.withholdingMinor - (balance.responsibilityMinor - adjustment.amountMinor));
            if (excess) await releaseCredit(tx, workspaceId, adjustment.invoicePayerId, excess, adjustment.id);
          } else checkedMinor(balance.responsibilityMinor + adjustment.amountMinor);
          let taxBase = balance.line.invoice.taxMinor, grossBase = balance.line.invoice.totalMinor;
          if (['CREDIT_NOTE', 'DISCOUNT'].includes(adjustment.kind)) {
            const previous = await tx.practiceAdjustment.findMany({ where: { invoiceId: balance.line.invoiceId, status: 'APPROVED', kind: { in: ['CHARGE_INCREASE', 'CREDIT_NOTE', 'DISCOUNT'] } } });
            for (const change of previous) { const direction = change.kind === 'CHARGE_INCREASE' ? 1 : -1; taxBase += direction * change.taxMinor; grossBase += direction * change.amountMinor; }
          }
          taxMinor = grossBase ? roundedRatio(adjustment.amountMinor, taxBase, grossBase) : 0;
          netMinor = adjustment.amountMinor - taxMinor;
        }
      } else if (adjustment.receiptId) {
        const balance = await receiptBalance(tx, adjustment.receiptId, workspaceId);
        assertPractice(!balance.receipt.reversedAt, 409, 'Receipt is already reversed');
        if (adjustment.kind === 'REFUND') {
          assertPractice(adjustment.amountMinor <= balance.availableMinor, 400, 'Refund exceeds unapplied funds. Issue a credit note first for invoiced funds.');
          assertPractice(!balance.receipt.receivedAt || (adjustment.occurredAt && adjustment.occurredAt >= balance.receipt.receivedAt), 400, 'Refund date cannot precede receipt date');
        }
        else {
          assertPractice(balance.refundedMinor === 0, 400, 'A refunded receipt cannot be reversed');
          await tx.practiceReceipt.update({ where: { id: adjustment.receiptId }, data: { reversedAt: new Date() } });
          await tx.practiceReceiptAllocation.updateMany({ where: { receiptId: adjustment.receiptId, reversedAt: null }, data: { reversedAt: new Date() } });
        }
      } else if (adjustment.kind === 'VOID' && adjustment.invoiceId) {
        const invoice = await tx.practiceInvoice.findFirst({ where: { id: adjustment.invoiceId, workspaceId }, include: { payers: true } });
        assertPractice(invoice?.status === 'ISSUED', 409, 'Invoice is already void');
        for (const line of invoice.payers) {
          const balance = await payerBalance(tx, line.id, workspaceId);
          assertPractice(balance.cashMinor === 0 && balance.withholdingMinor === 0, 400, 'Settled invoices require credit notes instead of voiding');
        }
        await tx.practiceInvoice.update({ where: { id: invoice.id }, data: { status: 'VOID' } });
      }
    }
    const result = await tx.practiceAdjustment.update({ where: { id: adjustment.id }, data: { status: body.decision, reviewedById: actorId, reviewedAt: new Date(), reviewReason: body.reason, netMinor, taxMinor } });
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: `ADJUSTMENT_${body.decision}`, entityId: adjustment.id } });
    return result;
  });
}

export async function generatePracticeRetainers(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict().parse(raw);
  const start = new Date(`${body.month}-01T00:00:00+03:00`);
  const [year, month] = body.month.split('-').map(Number);
  const following = new Date(Date.UTC(year, month, 1) - 10800000);
  assertPractice(start <= new Date(), 400, 'Future retainer periods are not yet due');
  return financeWrite(actorId, workspaceId, 'billing.manage', async (tx) => {
    const relationships = await tx.consultingFacility.findMany({ where: { workspaceId, rateType: 'MONTHLY', startsAt: { lt: following }, OR: [{ endsAt: null }, { endsAt: { gte: start } }] } });
    for (const row of relationships) {
      const sourceKey = `retainer:${row.id}:${body.month}`;
      await tx.practiceService.upsert({ where: { sourceKey }, update: {}, create: {
        workspaceId, sourceKey, facilityId: row.facilityId, serviceCode: 'MONTHLY_RETAINER', description: `Clinical retainer — ${body.month}`, serviceDate: row.startsAt > start ? row.startsAt : start, amountMinor: row.rateMinor,
        rateSnapshot: { relationshipId: row.id, month: body.month, rateType: row.rateType, rateMinor: row.rateMinor, coveredServices: row.coveredServices },
      } });
    }
    return { periods: relationships.length };
  });
}
