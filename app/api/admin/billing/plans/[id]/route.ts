export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  active: z.boolean().optional(),
  entitlementKeys: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  prices: z.array(z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    amountMinor: z.number().int().nonnegative(),
    interval: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
    trialDays: z.number().int().min(0).max(365).default(0),
    active: z.boolean().default(false),
    provider: z.enum(['PAYSTACK', 'MPESA', 'MANUAL']).nullable().optional(),
    providerPriceRef: z.string().max(200).nullable().optional(),
  }).strict()).max(20).optional(),
}).strict();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const allowed = await requirePermission('billing.plan.update', { entityType: 'Plan', resourceId: params.id }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan update', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const existing = await prisma.plan.findUnique({ where: { id: params.id }, select: { id: true, metadata: true } });
  if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  const { prices, entitlementKeys, ...fields } = parsed.data;
  const plan = await prisma.$transaction(async (tx) => {
    await tx.plan.update({
      where: { id: params.id },
      data: {
        ...fields,
        ...(entitlementKeys ? { metadata: { entitlementKeys: [...new Set(entitlementKeys)] } } : {}),
      },
    });
    for (const price of prices || []) {
      await tx.planPrice.upsert({
        where: { planId_currency_interval: { planId: params.id, currency: price.currency, interval: price.interval } },
        create: { planId: params.id, ...price },
        update: price,
      });
    }
    return tx.plan.findUniqueOrThrow({ where: { id: params.id }, include: { prices: true } });
  });
  await logAudit({ userId: allowed.userId, action: 'BILLING_PLAN_UPDATED', entityType: 'Plan', entityId: plan.id, outcome: 'SUCCESS', request, context: { active: plan.active } });
  return NextResponse.json({ plan });
}

// DELETE is a recoverable retirement: historical prices, payments and receipts are retained.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const allowed = await requirePermission('billing.plan.delete', { entityType: 'Plan', resourceId: params.id }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const result = await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.update({ where: { id: params.id }, data: { active: false } });
    await tx.planPrice.updateMany({ where: { planId: params.id }, data: { active: false } });
    return plan;
  }).catch(() => null);
  if (!result) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  await logAudit({ userId: allowed.userId, action: 'BILLING_PLAN_RETIRED', entityType: 'Plan', entityId: params.id, outcome: 'SUCCESS', request });
  return NextResponse.json({ retired: true });
}
