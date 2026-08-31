export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma, recomputeInvoice } from '@/lib/hub';
import { PAYER_TYPES, PAYMENT_METHODS } from '@/lib/hub-finance';

async function guard(userId: string, invoiceId: string, payerId: string) {
  const line = await prisma.invoicePayer.findUnique({ where: { id: payerId }, include: { invoice: true } });
  if (!line || line.invoiceId !== invoiceId || line.invoice.practitionerId !== userId) return null;
  return line;
}

// PATCH — record a payment or edit a payer line.
// body: { recordPayment?: number, markFullyPaid?: bool, method?, dueDate?, amount?, payerName?, payerType?, insurerId?, contactPhone?, contactEmail? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; payerId: string } },
) {
  const auth = await requireHubPractitioner('hub.invoice.update');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const line = await guard(auth.userId, params.id, params.payerId);
  if (!line) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: any = {};

  if (body.markFullyPaid === true) {
    data.amountPaid = line.amount;
  } else if (body.recordPayment !== undefined) {
    const add = Math.max(0, Math.round(Number(body.recordPayment) || 0));
    data.amountPaid = Math.min(line.amount, line.amountPaid + add);
  } else if (body.amountPaid !== undefined) {
    data.amountPaid = Math.min(line.amount, Math.max(0, Math.round(Number(body.amountPaid) || 0)));
  }

  if (body.amount !== undefined) data.amount = Math.max(0, Math.round(Number(body.amount) || 0));
  if (body.payerName !== undefined) data.payerName = String(body.payerName).trim() || 'Payer';
  if (body.payerType !== undefined && PAYER_TYPES.includes(body.payerType)) data.payerType = body.payerType;
  if (body.insurerId !== undefined) data.insurerId = body.insurerId || null;
  if (body.method !== undefined) data.method = body.method && PAYMENT_METHODS.includes(body.method) ? body.method : null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone?.trim() || null;
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail?.trim() || null;

  await prisma.invoicePayer.update({ where: { id: params.payerId }, data });
  await recomputeInvoice(params.id);
  return NextResponse.json({ ok: true });
}

// DELETE — remove a payer line.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; payerId: string } },
) {
  const auth = await requireHubPractitioner('hub.invoice.update');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const line = await guard(auth.userId, params.id, params.payerId);
  if (!line) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.invoicePayer.delete({ where: { id: params.payerId } });
  await recomputeInvoice(params.id);
  return NextResponse.json({ ok: true });
}
