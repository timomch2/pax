export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isPaymentConfigured } from '@/lib/brief-pricing';
import { z } from 'zod';
import { settleVerifiedPayment } from '@/lib/billing';
import { verifyPaystackTransaction } from '@/lib/paystack';

const verifySchema = z.object({ reference: z.string().min(8).max(200) }).strict();

// POST — verify a Paystack transaction after the user returns from checkout,
// and mark the BriefPurchase as PAID on success. Idempotent.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = verifySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid reference' }, { status: 400 });
  const { reference } = parsed.data;

  const purchase = await prisma.briefPurchase.findFirst({
    where: { providerReference: reference, userId: session.user.id, debateId: params.id },
    select: { id: true, status: true, paymentIntentId: true },
  });
  if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
  if (purchase.status === 'PAID') return NextResponse.json({ status: 'PAID', alreadyVerified: true });

  if (!isPaymentConfigured()) {
    return NextResponse.json({ error: 'Payments are not enabled yet.', code: 'PAYMENT_NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const transaction = await verifyPaystackTransaction(reference);
    if (transaction.status !== 'success') {
      return NextResponse.json({ status: 'FAILED' }, { status: 402 });
    }
    await settleVerifiedPayment({
      provider: 'PAYSTACK',
      providerTransactionId: String(transaction.id),
      reference: transaction.reference,
      amountMinor: transaction.amount,
      currency: transaction.currency,
      customerEmail: transaction.customer?.email || '',
      paidAt: transaction.paid_at ? new Date(transaction.paid_at) : null,
      metadata: transaction.metadata || {},
    });
    return NextResponse.json({ status: 'PAID' });
  } catch (error) {
    console.error('Brief purchase verification failed');
    return NextResponse.json({ error: 'Verification failed.' }, { status: 502 });
  }
}
