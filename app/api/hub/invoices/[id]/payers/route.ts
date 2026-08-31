export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma, recomputeInvoice } from '@/lib/hub';
import { PAYER_TYPES, PAYMENT_METHODS } from '@/lib/hub-finance';

// POST — add a payer line to an existing invoice.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireHubPractitioner('hub.invoice.update');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const inv = await prisma.invoice.findFirst({ where: { id: params.id, practitionerId: auth.userId } });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const p = await req.json().catch(() => ({}));
  const amount = Math.max(0, Math.round(Number(p.amount) || 0));
  if (amount <= 0) return NextResponse.json({ error: 'Amount must be greater than zero.' }, { status: 400 });
  await prisma.invoicePayer.create({
    data: {
      invoiceId: params.id,
      payerType: PAYER_TYPES.includes(p.payerType) ? p.payerType : 'PATIENT',
      payerName: (p.payerName ?? '').trim() || 'Payer',
      insurerId: p.insurerId || null,
      amount,
      amountPaid: 0,
      method: p.method && PAYMENT_METHODS.includes(p.method) ? p.method : null,
      dueDate: p.dueDate ? new Date(p.dueDate) : null,
      contactPhone: p.contactPhone?.trim() || null,
      contactEmail: p.contactEmail?.trim() || null,
    },
  });
  await recomputeInvoice(params.id);
  return NextResponse.json({ ok: true });
}
