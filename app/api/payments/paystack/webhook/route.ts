export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applyPaystackRefundEvent, safeWebhookPayload, settleVerifiedPayment } from '@/lib/billing';
import { verifyPaystackWebhook, type PaystackTransaction } from '@/lib/paystack';

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaystackWebhook(rawBody, request.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: { event?: string; data?: PaystackTransaction & { transaction_reference?: string; refund_reference?: string | null } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const eventId = createHash('sha256').update(rawBody).digest('hex');
  const stored = await prisma.webhookEvent.upsert({
    where: { provider_providerEventId: { provider: 'PAYSTACK', providerEventId: eventId } },
    create: {
      provider: 'PAYSTACK',
      providerEventId: eventId,
      eventType: payload.event || 'unknown',
      payload: safeWebhookPayload(payload),
    },
    update: {},
  });
  if (stored.status === 'PROCESSED' || stored.status === 'IGNORED') {
    return NextResponse.json({ received: true, duplicate: true });
  }
  const isRefundEvent = Boolean(payload.event?.startsWith('refund.'));
  if ((payload.event !== 'charge.success' && !isRefundEvent) || !payload.data) {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'IGNORED', processedAt: new Date() } });
    return NextResponse.json({ received: true });
  }

  try {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'PROCESSING', attemptCount: { increment: 1 } } });
    if (isRefundEvent) {
      await applyPaystackRefundEvent({
        transactionReference: payload.data.transaction_reference || '',
        refundReference: payload.data.refund_reference,
        amountMinor: Number(payload.data.amount),
        currency: payload.data.currency,
        providerStatus: payload.event!.slice('refund.'.length),
      });
    } else {
      await settleVerifiedPayment({
        provider: 'PAYSTACK',
        providerTransactionId: String(payload.data.id),
        reference: payload.data.reference,
        amountMinor: payload.data.amount,
        currency: payload.data.currency,
        customerEmail: payload.data.customer?.email || '',
        paidAt: payload.data.paid_at ? new Date(payload.data.paid_at) : null,
        metadata: payload.data.metadata || {},
      });
    }
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'PROCESSED', processedAt: new Date(), lastError: null } });
    return NextResponse.json({ received: true });
  } catch (error) {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'FAILED', lastError: error instanceof Error ? error.message.slice(0, 500) : 'PROCESSING_FAILED' } });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
