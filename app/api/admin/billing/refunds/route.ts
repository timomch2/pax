export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { createPaystackRefund } from '@/lib/paystack';

const refundSchema = z.object({
  paymentTransactionId: z.string().cuid(),
  amountMinor: z.number().int().positive(),
  reason: z.string().trim().min(3).max(2_000),
  idempotencyKey: z.string().trim().min(16).max(200),
}).strict();

export async function GET(request: Request) {
  const allowed = await requirePermission('payment.refund', { entityType: 'Refund' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const refunds = await prisma.refund.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { paymentTransaction: { select: { providerTransactionId: true, rawReference: true } } },
  });
  return NextResponse.json({ refunds });
}

export async function POST(request: Request) {
  const allowed = await requirePermission('payment.refund', { entityType: 'Refund' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = refundSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid refund request' }, { status: 400 });

  const existing = await prisma.refund.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } });
  if (existing) return NextResponse.json({ refund: existing, duplicate: true });

  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id: parsed.data.paymentTransactionId },
    include: { paymentIntent: true, refunds: { where: { status: { in: ['PENDING', 'SUCCEEDED'] } }, select: { amountMinor: true } } },
  });
  if (!transaction || transaction.status !== 'SUCCEEDED') return NextResponse.json({ error: 'Refundable transaction not found' }, { status: 404 });
  if (transaction.provider !== 'PAYSTACK') return NextResponse.json({ error: 'Automated refunds are not configured for this provider' }, { status: 409 });
  const alreadyRefunded = transaction.refunds.reduce((sum, refund) => sum + refund.amountMinor, 0);
  if (alreadyRefunded + parsed.data.amountMinor > transaction.amountMinor) return NextResponse.json({ error: 'Refund exceeds the remaining refundable amount' }, { status: 409 });

  const refund = await prisma.refund.create({
    data: {
      paymentIntentId: transaction.paymentIntentId,
      paymentTransactionId: transaction.id,
      provider: transaction.provider,
      amountMinor: parsed.data.amountMinor,
      currency: transaction.currency,
      reason: parsed.data.reason,
      idempotencyKey: parsed.data.idempotencyKey,
    },
  });
  try {
    const providerRefund = await createPaystackRefund({
      transaction: transaction.rawReference || transaction.providerTransactionId,
      amountMinor: refund.amountMinor,
      currency: refund.currency,
      customerNote: parsed.data.reason,
      merchantNote: `PAX refund ${refund.id}`,
    });
    const updated = await prisma.refund.update({
      where: { id: refund.id },
      data: { providerRefundId: String(providerRefund.id), providerStatus: providerRefund.status },
    });
    await logAudit({ userId: allowed.userId, action: 'PAYMENT_REFUND_REQUESTED', entityType: 'Refund', entityId: refund.id, outcome: 'SUCCESS', request, context: { amountMinor: refund.amountMinor, currency: refund.currency } });
    return NextResponse.json({ refund: updated }, { status: 202 });
  } catch (error) {
    await prisma.refund.update({ where: { id: refund.id }, data: { status: 'FAILED', providerStatus: 'request_failed' } });
    await logAudit({ userId: allowed.userId, action: 'PAYMENT_REFUND_REQUESTED', entityType: 'Refund', entityId: refund.id, outcome: 'FAILURE', request });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Refund request failed' }, { status: 502 });
  }
}
