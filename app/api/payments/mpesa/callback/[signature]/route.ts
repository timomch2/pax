export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { settleVerifiedPayment } from '@/lib/billing';
import { verifyMpesaCallbackSignature } from '@/lib/mpesa';

type CallbackItem = { Name?: string; Value?: string | number };
type StkCallback = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackItem[] };
};

function itemValue(items: CallbackItem[], name: string): string | number | undefined {
  return items.find((item) => item.Name === name)?.Value;
}

export async function POST(request: Request, { params }: { params: { signature: string } }) {
  if (!verifyMpesaCallbackSignature(params.signature, 'stk')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await request.json().catch(() => null) as { Body?: { stkCallback?: StkCallback } } | null;
  const callback = body?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID || typeof callback.ResultCode !== 'number') {
    return NextResponse.json({ error: 'Invalid callback' }, { status: 400 });
  }
  const items = callback.CallbackMetadata?.Item || [];
  const receipt = itemValue(items, 'MpesaReceiptNumber');
  const amount = Number(itemValue(items, 'Amount'));
  const eventId = createHash('sha256')
    .update(`${callback.CheckoutRequestID}:${callback.ResultCode}:${String(receipt || '')}`)
    .digest('hex');
  const stored = await prisma.webhookEvent.upsert({
    where: { provider_providerEventId: { provider: 'MPESA', providerEventId: eventId } },
    create: {
      provider: 'MPESA', providerEventId: eventId, eventType: 'stk.callback',
      payload: {
        checkoutRequestId: callback.CheckoutRequestID,
        merchantRequestId: callback.MerchantRequestID || null,
        resultCode: callback.ResultCode,
        receipt: typeof receipt === 'string' ? receipt : null,
      },
    },
    update: {},
  });
  if (stored.status === 'PROCESSED' || stored.status === 'IGNORED') return NextResponse.json({ received: true, duplicate: true });

  const intent = await prisma.paymentIntent.findUnique({
    where: { provider_providerReference: { provider: 'MPESA', providerReference: callback.CheckoutRequestID } },
  });
  if (!intent) {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'FAILED', lastError: 'PAYMENT_INTENT_NOT_FOUND', attemptCount: { increment: 1 } } });
    return NextResponse.json({ received: true });
  }
  if (callback.ResultCode !== 0) {
    await prisma.$transaction([
      prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'FAILED', failureCode: String(callback.ResultCode), failureMessage: callback.ResultDesc?.slice(0, 500) } }),
      prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'PROCESSED', processedAt: new Date(), attemptCount: { increment: 1 } } }),
    ]);
    return NextResponse.json({ received: true });
  }
  if (typeof receipt !== 'string' || !Number.isFinite(amount)) {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'FAILED', lastError: 'MISSING_PAYMENT_METADATA', attemptCount: { increment: 1 } } });
    return NextResponse.json({ received: true });
  }

  try {
    await settleVerifiedPayment({
      provider: 'MPESA',
      providerTransactionId: receipt,
      reference: callback.CheckoutRequestID,
      amountMinor: Math.round(amount * 100),
      currency: 'KES',
      customerEmail: intent.customerEmail,
      paidAt: new Date(),
      metadata: { intentId: intent.id, userId: intent.userId, resourceType: intent.resourceType, resourceId: intent.resourceId },
    });
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'PROCESSED', processedAt: new Date(), attemptCount: { increment: 1 }, lastError: null } });
  } catch (error) {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'FAILED', attemptCount: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 500) : 'PROCESSING_FAILED' } });
  }
  return NextResponse.json({ received: true });
}
