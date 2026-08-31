export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { settleVerifiedPayment } from '@/lib/billing';
import { verifyMpesaCallbackSignature } from '@/lib/mpesa';

const c2bSchema = z.object({
  TransID: z.string().min(5).max(40),
  TransTime: z.union([z.string(), z.number()]).optional(),
  TransAmount: z.union([z.string(), z.number()]),
  BusinessShortCode: z.union([z.string(), z.number()]),
  BillRefNumber: z.string().min(3).max(100),
  MSISDN: z.union([z.string(), z.number()]),
}).passthrough();

export async function POST(request: Request, { params }: { params: { signature: string } }) {
  if (!verifyMpesaCallbackSignature(params.signature, 'c2b')) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 404 });
  const parsed = c2bSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid request' });
  const stored = await prisma.webhookEvent.upsert({
    where: { provider_providerEventId: { provider: 'MPESA', providerEventId: `c2b:${parsed.data.TransID}` } },
    create: { provider: 'MPESA', providerEventId: `c2b:${parsed.data.TransID}`, eventType: 'c2b.confirmation', payload: { transactionId: parsed.data.TransID, billReference: parsed.data.BillRefNumber, amount: String(parsed.data.TransAmount) } },
    update: {},
  });
  if (stored.status === 'PROCESSED') return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  const intent = await prisma.paymentIntent.findUnique({ where: { provider_providerReference: { provider: 'MPESA', providerReference: parsed.data.BillRefNumber } } });
  if (!intent || String(parsed.data.BusinessShortCode) !== process.env.MPESA_SHORTCODE) {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'FAILED', lastError: 'PAYMENT_INTENT_OR_SHORTCODE_MISMATCH', attemptCount: { increment: 1 } } });
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid account' });
  }
  try {
    await settleVerifiedPayment({
      provider: 'MPESA', providerTransactionId: parsed.data.TransID, reference: parsed.data.BillRefNumber,
      amountMinor: Math.round(Number(parsed.data.TransAmount) * 100), currency: 'KES', customerEmail: intent.customerEmail,
      paidAt: new Date(), metadata: { intentId: intent.id, userId: intent.userId, resourceType: intent.resourceType, resourceId: intent.resourceId },
    });
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'PROCESSED', processedAt: new Date(), attemptCount: { increment: 1 }, lastError: null } });
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { status: 'FAILED', attemptCount: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 500) : 'PROCESSING_FAILED' } });
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Processing failed' });
  }
}
