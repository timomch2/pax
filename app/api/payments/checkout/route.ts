export const dynamic = 'force-dynamic';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { initializePaystackTransaction } from '@/lib/paystack';
import { createMpesaStkPush, mpesaCallbackSignature, normalizeKenyanPhone } from '@/lib/mpesa';

const checkoutSchema = z.object({
  planPriceId: z.string().cuid(),
  provider: z.enum(['PAYSTACK', 'MPESA']),
  phone: z.string().max(30).optional(),
  mpesaMode: z.enum(['STK_PUSH', 'PAYBILL']).default('STK_PUSH'),
}).strict();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await authorizeUser(session.user.id, 'payment.purchase', { ownerId: session.user.id, entityType: 'PlanPrice' });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });

  const price = await prisma.planPrice.findFirst({
    where: { id: parsed.data.planPriceId, active: true, plan: { active: true } },
    include: { plan: { select: { id: true, slug: true, name: true } } },
  });
  if (!price) return NextResponse.json({ error: 'Plan price not found' }, { status: 404 });
  if (price.interval !== 'ONE_TIME') {
    return NextResponse.json({ error: 'Recurring provider subscriptions require an approved provider plan mapping' }, { status: 409 });
  }
  if (price.provider && price.provider !== parsed.data.provider) {
    return NextResponse.json({ error: 'Provider is not enabled for this price' }, { status: 400 });
  }

  const internalReference = `pax_plan_${randomUUID()}`;
  const intent = await prisma.paymentIntent.create({
    data: {
      userId: session.user.id,
      planPriceId: price.id,
      kind: 'PLAN_PURCHASE',
      resourceType: 'PLAN',
      resourceId: price.plan.id,
      provider: parsed.data.provider,
      providerReference: internalReference,
      idempotencyKey: `plan:${session.user.id}:${price.id}:${randomUUID()}`,
      amountMinor: price.amountMinor,
      currency: price.currency.toUpperCase(),
      customerEmail: session.user.email,
      metadata: { planSlug: price.plan.slug },
    },
  });
  const origin = process.env.NEXTAUTH_URL || new URL(request.url).origin;

  try {
    if (parsed.data.provider === 'PAYSTACK') {
      const initialized = await initializePaystackTransaction({
        email: session.user.email,
        amountMinor: price.amountMinor,
        currency: price.currency,
        callbackUrl: `${origin}/billing?payment_intent=${intent.id}`,
        reference: internalReference,
        metadata: { intentId: intent.id, userId: session.user.id, resourceType: 'PLAN', resourceId: price.plan.id },
      });
      await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'REQUIRES_ACTION' } });
      return NextResponse.json({ paymentIntentId: intent.id, authorizationUrl: initialized.authorization_url });
    }

    if (price.currency.toUpperCase() !== 'KES' || price.amountMinor % 100 !== 0) {
      return NextResponse.json({ error: 'M-Pesa prices must be whole KES amounts' }, { status: 400 });
    }
    if (parsed.data.mpesaMode === 'PAYBILL') {
      const paybillReference = `PAX${randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase()}`;
      await prisma.paymentIntent.update({ where: { id: intent.id }, data: { providerReference: paybillReference, status: 'REQUIRES_ACTION', metadata: { planSlug: price.plan.slug, mode: 'PAYBILL' } } });
      const shortcode = process.env.MPESA_SHORTCODE;
      if (!shortcode) throw new Error('MPESA_NOT_CONFIGURED');
      return NextResponse.json({ paymentIntentId: intent.id, paybill: { businessNumber: shortcode, accountReference: paybillReference, amountKes: price.amountMinor / 100 } });
    }
    const phone = parsed.data.phone ? normalizeKenyanPhone(parsed.data.phone) : null;
    if (!phone) return NextResponse.json({ error: 'A valid Kenyan M-Pesa phone number is required' }, { status: 400 });
    const callbackUrl = `${origin}/api/payments/mpesa/callback/${mpesaCallbackSignature()}`;
    const pushed = await createMpesaStkPush({
      phone,
      amountKes: price.amountMinor / 100,
      accountReference: intent.id,
      description: price.plan.name,
      callbackUrl,
    });
    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: {
        providerReference: pushed.CheckoutRequestID,
        status: 'REQUIRES_ACTION',
        metadata: { planSlug: price.plan.slug, phone, merchantRequestId: pushed.MerchantRequestID },
      },
    });
    return NextResponse.json({ paymentIntentId: intent.id, checkoutRequestId: pushed.CheckoutRequestID, message: pushed.CustomerMessage });
  } catch {
    await prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: 'FAILED', failureCode: 'PROVIDER_INITIALIZATION_FAILED' } });
    return NextResponse.json({ error: 'Could not start payment' }, { status: 502 });
  }
}
