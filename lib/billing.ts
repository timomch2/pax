import { createHash } from 'node:crypto';
import type { Prisma, PaymentProvider } from '@prisma/client';
import { prisma } from '@/lib/db';

export type VerifiedProviderPayment = {
  provider: PaymentProvider;
  providerTransactionId: string;
  reference: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  paidAt: Date | null;
  metadata: Record<string, unknown>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function receiptNumber(provider: PaymentProvider, providerTransactionId: string): string {
  const digest = createHash('sha256').update(`${provider}:${providerTransactionId}`).digest('hex').slice(0, 16).toUpperCase();
  return `PAX-RCP-${digest}`;
}

function providerMatchesIntent(intent: {
  id: string;
  userId: string;
  provider: PaymentProvider;
  providerReference: string | null;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  resourceType: string | null;
  resourceId: string | null;
}, payment: VerifiedProviderPayment): string | null {
  if (intent.provider !== payment.provider) return 'PROVIDER_MISMATCH';
  if (intent.providerReference !== payment.reference) return 'REFERENCE_MISMATCH';
  if (intent.amountMinor !== payment.amountMinor) return 'AMOUNT_MISMATCH';
  if (intent.currency.toUpperCase() !== payment.currency.toUpperCase()) return 'CURRENCY_MISMATCH';
  if (normalizeEmail(intent.customerEmail) !== normalizeEmail(payment.customerEmail)) return 'CUSTOMER_MISMATCH';
  if (payment.metadata.intentId && payment.metadata.intentId !== intent.id) return 'INTENT_METADATA_MISMATCH';
  if (payment.metadata.userId && payment.metadata.userId !== intent.userId) return 'USER_METADATA_MISMATCH';
  if (payment.metadata.resourceType && payment.metadata.resourceType !== intent.resourceType) return 'RESOURCE_TYPE_MISMATCH';
  if (payment.metadata.resourceId && payment.metadata.resourceId !== intent.resourceId) return 'RESOURCE_ID_MISMATCH';
  return null;
}

export async function settleVerifiedPayment(payment: VerifiedProviderPayment): Promise<{ intentId: string; alreadySettled: boolean }> {
  return prisma.$transaction(async (tx) => {
    const intent = await tx.paymentIntent.findUnique({
      where: { provider_providerReference: { provider: payment.provider, providerReference: payment.reference } },
    });
    if (!intent) throw new Error('PAYMENT_INTENT_NOT_FOUND');

    const mismatch = providerMatchesIntent(intent, payment);
    if (mismatch) {
      await tx.reconciliationRecord.upsert({
        where: { provider_providerTransactionId: { provider: payment.provider, providerTransactionId: payment.providerTransactionId } },
        create: {
          provider: payment.provider,
          providerTransactionId: payment.providerTransactionId,
          paymentIntentId: intent.id,
          expectedAmountMinor: intent.amountMinor,
          providerAmountMinor: payment.amountMinor,
          currency: payment.currency.toUpperCase(),
          status: 'MISMATCHED',
          details: { reason: mismatch },
        },
        update: { status: 'MISMATCHED', details: { reason: mismatch } },
      });
      throw new Error(mismatch);
    }

    const existing = await tx.paymentTransaction.findUnique({
      where: { provider_providerTransactionId: { provider: payment.provider, providerTransactionId: payment.providerTransactionId } },
    });
    if (existing?.status === 'SUCCEEDED') return { intentId: intent.id, alreadySettled: true };

    const transaction = await tx.paymentTransaction.upsert({
      where: { provider_providerTransactionId: { provider: payment.provider, providerTransactionId: payment.providerTransactionId } },
      create: {
        paymentIntentId: intent.id,
        provider: payment.provider,
        providerTransactionId: payment.providerTransactionId,
        status: 'SUCCEEDED',
        amountMinor: payment.amountMinor,
        currency: payment.currency.toUpperCase(),
        providerPaidAt: payment.paidAt,
        rawReference: payment.reference,
      },
      update: { status: 'SUCCEEDED', providerPaidAt: payment.paidAt },
    });

    await tx.paymentIntent.update({ where: { id: intent.id }, data: { status: 'SUCCEEDED' } });

    if (intent.resourceType === 'CONSENSUS_BRIEF' && intent.resourceId) {
      await tx.briefPurchase.updateMany({
        where: { paymentIntentId: intent.id, userId: intent.userId, debateId: intent.resourceId },
        data: { status: 'PAID', paidAt: payment.paidAt || new Date() },
      });
      await tx.entitlement.upsert({
        where: {
          userId_key_resourceType_resourceId: {
            userId: intent.userId,
            key: 'knowledge.brief.read',
            resourceType: 'CONSENSUS_BRIEF',
            resourceId: intent.resourceId,
          },
        },
        create: {
          userId: intent.userId,
          key: 'knowledge.brief.read',
          resourceType: 'CONSENSUS_BRIEF',
          resourceId: intent.resourceId,
          status: 'ACTIVE',
        },
        update: { status: 'ACTIVE', revokedAt: null, expiresAt: null },
      });
    }

    if (intent.resourceType === 'PLAN' && intent.planPriceId) {
      const resourceId = intent.resourceId;
      if (!resourceId) throw new Error('PLAN_RESOURCE_MISSING');
      const price = await tx.planPrice.findUnique({
        where: { id: intent.planPriceId },
        include: { plan: { select: { metadata: true } } },
      });
      const metadata = price?.plan.metadata && typeof price.plan.metadata === 'object' && !Array.isArray(price.plan.metadata)
        ? price.plan.metadata as Record<string, unknown>
        : {};
      const keys = Array.isArray(metadata.entitlementKeys)
        ? metadata.entitlementKeys.filter((key): key is string => typeof key === 'string' && key.length > 0 && key.length <= 100)
        : [];
      for (const key of keys) {
        await tx.entitlement.upsert({
          where: { userId_key_resourceType_resourceId: { userId: intent.userId, key, resourceType: 'PLAN', resourceId } },
          create: { userId: intent.userId, key, resourceType: 'PLAN', resourceId, status: 'ACTIVE' },
          update: { status: 'ACTIVE', revokedAt: null },
        });
      }
    }

    await tx.receipt.upsert({
      where: { receiptNumber: receiptNumber(payment.provider, payment.providerTransactionId) },
      create: {
        receiptNumber: receiptNumber(payment.provider, payment.providerTransactionId),
        userId: intent.userId,
        paymentIntentId: intent.id,
        paymentTransactionId: transaction.id,
        amountMinor: payment.amountMinor,
        currency: payment.currency.toUpperCase(),
      },
      update: {},
    });
    await tx.reconciliationRecord.upsert({
      where: { provider_providerTransactionId: { provider: payment.provider, providerTransactionId: payment.providerTransactionId } },
      create: {
        provider: payment.provider,
        providerTransactionId: payment.providerTransactionId,
        paymentIntentId: intent.id,
        expectedAmountMinor: intent.amountMinor,
        providerAmountMinor: payment.amountMinor,
        currency: payment.currency.toUpperCase(),
        status: 'MATCHED',
      },
      update: { status: 'MATCHED', resolvedAt: new Date() },
    });
    return { intentId: intent.id, alreadySettled: false };
  }, { isolationLevel: 'Serializable' });
}

export async function applyPaystackRefundEvent(input: {
  transactionReference: string;
  refundReference?: string | null;
  amountMinor: number;
  currency: string;
  providerStatus: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.paymentTransaction.findFirst({
      where: { provider: 'PAYSTACK', rawReference: input.transactionReference },
      include: { paymentIntent: true },
    });
    if (!transaction) throw new Error('REFUND_TRANSACTION_NOT_FOUND');
    if (transaction.currency.toUpperCase() !== input.currency.toUpperCase()) throw new Error('REFUND_CURRENCY_MISMATCH');

    const refund = await tx.refund.findFirst({
      where: {
        paymentTransactionId: transaction.id,
        amountMinor: input.amountMinor,
        OR: [
          ...(input.refundReference ? [{ providerRefundId: input.refundReference }] : []),
          { status: 'PENDING' },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!refund) throw new Error('REFUND_REQUEST_NOT_FOUND');
    const successful = input.providerStatus === 'processed';
    const failed = input.providerStatus === 'failed';
    await tx.refund.update({
      where: { id: refund.id },
      data: {
        providerStatus: input.providerStatus,
        ...(input.refundReference && !refund.providerRefundId ? { providerRefundId: input.refundReference } : {}),
        ...(successful ? { status: 'SUCCEEDED', completedAt: new Date() } : {}),
        ...(failed ? { status: 'FAILED', completedAt: new Date() } : {}),
      },
    });
    if (!successful) return;

    const totals = await tx.refund.aggregate({
      where: { paymentTransactionId: transaction.id, status: 'SUCCEEDED' },
      _sum: { amountMinor: true },
    });
    if ((totals._sum.amountMinor || 0) < transaction.amountMinor) return;
    await tx.paymentTransaction.update({ where: { id: transaction.id }, data: { status: 'REFUNDED' } });
    await tx.entitlement.updateMany({
      where: {
        userId: transaction.paymentIntent.userId,
        resourceType: transaction.paymentIntent.resourceType,
        resourceId: transaction.paymentIntent.resourceId,
        status: 'ACTIVE',
      },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }, { isolationLevel: 'Serializable' });
}

export function safeWebhookPayload(input: unknown): Prisma.InputJsonValue {
  if (!input || typeof input !== 'object') return {};
  const body = input as Record<string, any>;
  const data = body.data && typeof body.data === 'object' ? body.data : {};
  return {
    event: typeof body.event === 'string' ? body.event : null,
    data: {
      id: typeof data.id === 'number' || typeof data.id === 'string' ? String(data.id) : null,
      reference: typeof data.reference === 'string' ? data.reference : null,
      status: typeof data.status === 'string' ? data.status : null,
      amount: typeof data.amount === 'number' ? data.amount : null,
      currency: typeof data.currency === 'string' ? data.currency : null,
    },
  };
}
