export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BRIEF_PRICE_CENTS, BRIEF_CURRENCY, isPaymentConfigured, isPilotFree } from '@/lib/brief-pricing';
import { authorizeUser } from '@/lib/authorization';
import { initializePaystackTransaction } from '@/lib/paystack';
import { randomUUID } from 'node:crypto';

// POST — begin a $0.99 purchase to unlock a detailed consensus brief.
// Initializes a Paystack transaction and returns its authorization URL.
// Verification happens in ./verify once the user completes payment.
//
// NOTE: This is first-party PAX revenue (selling PAX's own synthesised report),
// NOT brokering a third-party transaction — so it is consistent with the
// passive-intermediary model.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await authorizeUser(session.user.id, 'payment.purchase', { ownerId: session.user.id, entityType: 'Debate', resourceId: params.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  if (!session.user.email) return NextResponse.json({ error: 'A verified email is required' }, { status: 400 });

  const debate = await prisma.debate.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, consensusBrief: true, consensusPublishedAt: true },
  });
  if (!debate || !debate.consensusBrief) return NextResponse.json({ error: 'No brief available' }, { status: 404 });
  if (!debate.consensusPublishedAt) return NextResponse.json({ error: 'Brief not yet published' }, { status: 403 });

  // During the pilot the full brief is free — no payment needed.
  if (isPilotFree()) {
    return NextResponse.json({ error: 'Brief is free during the pilot', code: 'PILOT_FREE' }, { status: 400 });
  }

  // Already purchased?
  const existing = await prisma.briefPurchase.findUnique({
    where: { userId_debateId: { userId: session.user.id, debateId: debate.id } },
    select: { status: true },
  });
  if (existing?.status === 'PAID') {
    return NextResponse.json({ alreadyPurchased: true });
  }

  // Payment provider not wired up yet — fail clearly. When PAYSTACK keys are set,
  // the block below initializes a real transaction.
  if (!isPaymentConfigured()) {
    return NextResponse.json(
      { error: 'Payments are not enabled yet. Please check back shortly.', code: 'PAYMENT_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const reference = `pax_brief_${randomUUID()}`;
  const { purchase, intent } = await prisma.$transaction(async (tx) => {
    const paymentIntent = await tx.paymentIntent.create({
      data: {
        userId: session.user.id,
        kind: 'ONE_TIME_PURCHASE',
        resourceType: 'CONSENSUS_BRIEF',
        resourceId: debate.id,
        provider: 'PAYSTACK',
        providerReference: reference,
        idempotencyKey: `brief:${session.user.id}:${debate.id}:${randomUUID()}`,
        amountMinor: BRIEF_PRICE_CENTS,
        currency: BRIEF_CURRENCY,
        customerEmail: session.user.email!,
        status: 'PENDING',
        metadata: { debateTitle: debate.title },
      },
    });
    const briefPurchase = await tx.briefPurchase.upsert({
      where: { userId_debateId: { userId: session.user.id, debateId: debate.id } },
      create: {
        userId: session.user.id,
        debateId: debate.id,
        amountCents: BRIEF_PRICE_CENTS,
        currency: BRIEF_CURRENCY,
        status: 'PENDING',
        provider: 'paystack',
        providerReference: reference,
        paymentIntentId: paymentIntent.id,
      },
      update: {
        status: 'PENDING',
        amountCents: BRIEF_PRICE_CENTS,
        currency: BRIEF_CURRENCY,
        providerReference: reference,
        paymentIntentId: paymentIntent.id,
      },
      select: { id: true },
    });
    return { purchase: briefPurchase, intent: paymentIntent };
  });

  const baseUrl = process.env.NEXTAUTH_URL || '';
  const callbackUrl = `${baseUrl}/knowledge/${debate.id}?brief_purchase=${purchase.id}`;

  try {
    const initialized = await initializePaystackTransaction({
      email: session.user.email,
      amountMinor: BRIEF_PRICE_CENTS,
      currency: BRIEF_CURRENCY,
      callbackUrl,
      reference,
      metadata: {
        intentId: intent.id,
        purchaseId: purchase.id,
        resourceType: 'CONSENSUS_BRIEF',
        resourceId: debate.id,
        userId: session.user.id,
        kind: 'consensus_brief',
      },
    });
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'REQUIRES_ACTION' } });
    return NextResponse.json({ authorizationUrl: initialized.authorization_url, reference: initialized.reference });
  } catch (error) {
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'FAILED', failureCode: 'PROVIDER_INITIALIZATION_FAILED' } });
    console.error('Brief purchase initialization failed');
    return NextResponse.json({ error: 'Could not start payment.' }, { status: 502 });
  }
}
