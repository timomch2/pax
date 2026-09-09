import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { assertPractice, practiceMembershipActive } from '@/lib/practice-policy';
import { practiceTransaction, lockPractice } from '@/lib/practice-db';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function legacyKshToMinor(amount: number) { assertPractice(Number.isSafeInteger(amount) && amount >= 0 && amount <= 20000000, 400, 'Legacy KSh amount is invalid or exceeds the supported range; owner reconciliation is required'); return amount * 100; }

export async function practiceWorkspaceForOwner(ownerId: string) {
  if (process.env.PRACTICE_WORKSPACE_ENABLED !== 'true') return null;
  return prisma.practiceWorkspace.findUnique({ where: { ownerId }, include: { owner: true } });
}
export async function expandedPracticePath(ownerId: string) {
  const workspace = await practiceWorkspaceForOwner(ownerId);
  return workspace && practiceMembershipActive(workspace.owner) ? '/dashboard/practice' : null;
}

/** Legacy account identity is preserved explicitly; matching contact details never auto-merge patients. */
export async function legacyPatient(tx: Prisma.TransactionClient, ownerId: string, userId: string) {
  const account = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true } });
  return tx.hubPatient.upsert({ where: { practitionerId_legacyUserId: { practitionerId: ownerId, legacyUserId: userId } }, update: {}, create: { practitionerId: ownerId, legacyUserId: userId, name: account.name, email: account.email, phone: account.phone, patientCode: `PAX-P-${randomBytes(6).toString('hex').toUpperCase()}` } });
}

/** Stage bounded source snapshots for explicit owner review; repeat scans do not duplicate records. */
export async function scanPracticeLegacy(actorId: string, workspaceId: string) {
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId); const auth = await authorizePracticeUser(actorId, workspaceId, 'workspace.manage', tx);
    const existing = await tx.practiceReconciliation.findMany({ where: { workspaceId }, select: { sourceKey: true } });
    const known = new Set(existing.map((r) => r.sourceKey));
    const invoiceIds = [...known].filter((key) => key.startsWith('legacy:invoice:')).map((key) => key.slice('legacy:invoice:'.length));
    const billIds = [...known].filter((key) => key.startsWith('legacy:billing:')).map((key) => key.slice('legacy:billing:'.length));
    const invoices = await tx.invoice.findMany({ where: { practitionerId: auth.ownerId, id: { notIn: invoiceIds } }, take: 10, include: { payers: true }, orderBy: { id: 'asc' } });
    const bills = await tx.billingRecord.findMany({ where: { appointment: { practitionerId: auth.ownerId }, id: { notIn: billIds } }, take: 10, include: { appointment: { include: { patient: { select: { name: true } } } } }, orderBy: { id: 'asc' } });
    let staged = 0;
    for (const invoice of invoices) {
      const sourceKey = `legacy:invoice:${invoice.id}`; if (known.has(sourceKey)) continue;
      const day = new Date(invoice.serviceDate.toISOString().slice(0, 10));
      const possibleDuplicates = (await tx.billingRecord.findMany({ where: { amount: invoice.totalAmount, appointment: { practitionerId: auth.ownerId, dateTime: { gte: day, lt: new Date(day.getTime() + 86400000) }, patient: { name: { equals: invoice.patientName.trim(), mode: 'insensitive' } } } }, select: { id: true }, take: 20 })).map((b) => `legacy:billing:${b.id}`);
      await tx.practiceReconciliation.create({ data: { workspaceId, sourceKey, kind: 'INVOICE', snapshot: JSON.parse(JSON.stringify({ source: invoice, hash: digest(invoice), possibleDuplicates })) } });
      if (++staged >= 10) break;
    }
    if (staged < 10) for (const bill of bills) {
      const sourceKey = `legacy:billing:${bill.id}`; if (known.has(sourceKey)) continue;
      const day = new Date(bill.appointment.dateTime.toISOString().slice(0, 10));
      const possibleDuplicates = (await tx.invoice.findMany({ where: { practitionerId: auth.ownerId, totalAmount: bill.amount, serviceDate: { gte: day, lt: new Date(day.getTime() + 86400000) }, patientName: { equals: bill.appointment.patient.name.trim(), mode: 'insensitive' } }, select: { id: true }, take: 20 })).map((i) => `legacy:invoice:${i.id}`);
      await tx.practiceReconciliation.create({ data: { workspaceId, sourceKey, kind: 'BILLING', snapshot: JSON.parse(JSON.stringify({ source: bill, hash: digest(bill), possibleDuplicates })) } });
      if (++staged >= 10) break;
    }
    const appointments = await tx.appointment.findMany({ where: { practitionerId: auth.ownerId, practiceEvent: null }, take: 10, orderBy: { id: 'asc' } });
    for (const appointment of appointments) {
      const patient = await legacyPatient(tx, auth.ownerId, appointment.patientId);
      // Original duration was not stored. The explicit 30 minute conversion is retained in the rate snapshot.
      await tx.practiceEvent.create({ data: { workspaceId, legacyAppointmentId: appointment.id, patientId: patient.id, kind: 'APPOINTMENT', title: appointment.type, serviceCode: appointment.type, startsAt: appointment.dateTime, endsAt: new Date(appointment.dateTime.getTime() + 1800000), status: appointment.status, location: appointment.location, notes: null, billable: appointment.fee > 0, feeMinor: legacyKshToMinor(appointment.fee), createdById: actorId, rateSnapshot: { source: 'LEGACY_APPOINTMENT', originalFeeKsh: appointment.fee, inferredDurationMinutes: 30, notesPreservedOnLegacyRecord: true } } });
    }
    return { staged, appointmentsLinked: appointments.length, more: invoices.length + bills.length > staged || staged === 10 || appointments.length === 10 };
  });
}

/** Import only after source-by-source confirmation. Settled totals have unknown receipt dates unless separately evidenced. */
export async function reconcilePracticeLegacy(actorId: string, workspaceId: string, raw: unknown) {
  const body = z.object({ id: z.string().cuid(), decision: z.enum(['IMPORT', 'DUPLICATE', 'EXCLUDE', 'REFRESH']), reason: z.string().trim().min(10).max(1500), duplicateOf: z.string().max(200).optional() }).strict().parse(raw);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId); const auth = await authorizePracticeUser(actorId, workspaceId, 'billing.approve', tx);
    const item = await tx.practiceReconciliation.findFirst({ where: { id: body.id, workspaceId } });
    assertPractice(item && item.status === 'PENDING', 409, 'This reconciliation item has already changed');
    const snapshot = item.snapshot as any;
    if (body.decision === 'DUPLICATE') {
      const target = await tx.practiceReconciliation.findFirst({ where: { workspaceId, sourceKey: body.duplicateOf, status: 'IMPORTED' } });
      assertPractice(target && target.id !== item.id, 400, 'Choose the already imported record that represents this same income');
    }
    if (body.decision === 'IMPORT' || body.decision === 'REFRESH') {
      const id = item.sourceKey.split(':')[2];
      const invoice = item.kind === 'INVOICE' ? await tx.invoice.findFirst({ where: { id, practitionerId: auth.ownerId }, include: { payers: true } }) : null;
      const bill = item.kind === 'BILLING' ? await tx.billingRecord.findFirst({ where: { id, appointment: { practitionerId: auth.ownerId } }, include: { appointment: { include: { patient: { select: { name: true } } } } } }) : null;
      assertPractice(invoice || bill, 404, 'Legacy source no longer exists');
      if (body.decision === 'REFRESH') {
        await tx.practiceReconciliation.update({ where: { id: item.id }, data: { snapshot: JSON.parse(JSON.stringify({ ...snapshot, source: invoice ?? bill, hash: digest(invoice ?? bill) })) } });
        await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: 'LEGACY_REFRESH', entityId: item.id, context: { reason: body.reason, previousSnapshot: item.snapshot } } });
        return { ok: true };
      }
      assertPractice(invoice?.status !== 'DRAFT', 400, 'An unissued legacy draft is not income. Exclude it with a reason and recreate its services in the workspace.');
      assertPractice(digest(invoice ?? bill) === snapshot.hash, 409, 'Legacy source changed after staging. Refresh this reconciliation item before importing.');
      const totalMinor = legacyKshToMinor(invoice?.totalAmount ?? bill!.amount);
      assertPractice(totalMinor > 0, 400, 'A zero-value source requires an exclusion reason, not an income record');
      const patient = invoice?.hubPatientId ? await tx.hubPatient.findFirst({ where: { id: invoice.hubPatientId, practitionerId: auth.ownerId } }) : bill ? await legacyPatient(tx, auth.ownerId, bill.appointment.patientId) : null;
      const event = bill ? await tx.practiceEvent.findUnique({ where: { legacyAppointmentId: bill.appointmentId } }) : null;
      const serviceDate = invoice?.serviceDate ?? bill!.appointment.dateTime;
      const service = await tx.practiceService.create({ data: { workspaceId, sourceKey: item.sourceKey, eventId: event?.id, patientId: patient?.id, description: invoice?.serviceDesc ?? bill!.appointment.type, serviceCode: invoice?.serviceType ?? bill?.appointment.type ?? 'LEGACY_SERVICE', serviceDate, amountMinor: totalMinor, rateSnapshot: { source: item.sourceKey, originalKsh: totalMinor / 100 } } });
      const payerSources = invoice ? invoice.payers.map((p) => ({ key: p.id, name: p.payerName, kind: p.payerType, amount: p.amount, paid: p.amountPaid, email: p.contactEmail, phone: p.contactPhone, method: p.method, dueAt: p.dueDate })) : [{ key: bill!.id, name: bill!.appointment.patient.name, kind: 'PATIENT', amount: bill!.amount, paid: bill!.paymentStatus === 'PAID' ? bill!.amount : 0, email: patient?.email ?? null, phone: patient?.phone ?? null, method: null, dueAt: null }];
      assertPractice(payerSources.reduce((n, p) => n + legacyKshToMinor(p.amount), 0) === totalMinor && payerSources.every((p) => p.paid >= 0 && p.paid <= p.amount), 400, 'Legacy payer totals do not reconcile. Resolve the discrepancy before import.');
      const imported = await tx.practiceInvoice.create({ data: { workspaceId, sourceKey: item.sourceKey, requestHash: snapshot.hash, legacyInvoiceId: invoice?.id, number: `MIG-${invoice?.invoiceNumber ?? bill!.id}`, issuedAt: invoice?.createdAt ?? bill!.createdAt, createdById: actorId, netMinor: totalMinor, taxMinor: 0, totalMinor, taxSnapshot: { source: 'LEGACY_KSH', configuredTaxUnknown: true }, lines: { create: { serviceId: service.id, description: service.description, serviceCode: service.serviceCode, serviceDate, patientReference: patient?.patientCode ?? null, amountMinor: totalMinor } } } });
      for (const p of payerSources) {
        const payer = await tx.practicePayer.create({ data: { workspaceId, identityKey: `LEGACY:${item.sourceKey}:${p.key}`, kind: p.kind, name: p.name, patientId: p.kind === 'PATIENT' ? patient?.id : null, email: p.email, phone: p.phone, remindersEnabled: false } });
        const line = await tx.practiceInvoicePayer.create({ data: { invoiceId: imported.id, payerId: payer.id, amountMinor: legacyKshToMinor(p.amount), dueAt: p.dueAt, payerSnapshot: { name: p.name, kind: p.kind, source: item.sourceKey } } });
        if (p.paid > 0) {
          const receipt = await tx.practiceReceipt.create({ data: { workspaceId, payerId: payer.id, sourceKey: `${item.sourceKey}:receipt:${p.key}`, requestHash: snapshot.hash, amountMinor: legacyKshToMinor(p.paid), receivedAt: null, dateKnown: false, method: p.method ?? 'OTHER', reference: `Opening paid balance: ${item.sourceKey}`, recordedById: actorId } });
          await tx.practiceReceiptAllocation.create({ data: { receiptId: receipt.id, invoicePayerId: line.id, amountMinor: receipt.amountMinor, sourceKey: `${item.sourceKey}:allocation:${p.key}` } });
        }
      }
    }
    await tx.practiceReconciliation.update({ where: { id: item.id }, data: { status: body.decision === 'IMPORT' ? 'IMPORTED' : body.decision === 'DUPLICATE' ? 'DUPLICATE' : 'EXCLUDED', resolution: `${body.reason}${body.duplicateOf ? ` | Duplicate of ${body.duplicateOf}` : ''}`, resolvedById: actorId, resolvedAt: new Date() } });
    await tx.practiceAuditEvent.create({ data: { workspaceId, actorId, action: `LEGACY_${body.decision}`, entityId: item.id, context: { reason: body.reason, duplicateOf: body.duplicateOf ?? null } } });
    return { ok: true };
  });
}
