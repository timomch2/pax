export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const priceSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  amountMinor: z.number().int().nonnegative(),
  interval: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  trialDays: z.number().int().min(0).max(365).default(0),
  active: z.boolean().default(false),
  provider: z.enum(['PAYSTACK', 'MPESA', 'MANUAL']).nullable().optional(),
  providerPriceRef: z.string().max(200).nullable().optional(),
}).strict();

const planSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2_000).nullable().optional(),
  active: z.boolean().default(false),
  entitlementKeys: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  prices: z.array(priceSchema).max(20).default([]),
}).strict();

export async function GET(request: Request) {
  const allowed = await requirePermission('billing.plan.read', { entityType: 'Plan' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const plans = await prisma.plan.findMany({ include: { prices: { orderBy: [{ currency: 'asc' }, { interval: 'asc' }] } }, orderBy: { name: 'asc' } });
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const allowed = await requirePermission('billing.plan.create', { entityType: 'Plan' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { prices, entitlementKeys, ...data } = parsed.data;
  const plan = await prisma.plan.create({
    data: {
      ...data,
      metadata: { entitlementKeys: [...new Set(entitlementKeys)] },
      prices: { create: prices },
    },
    include: { prices: true },
  });
  await logAudit({ userId: allowed.userId, action: 'BILLING_PLAN_CREATED', entityType: 'Plan', entityId: plan.id, outcome: 'SUCCESS', request, context: { active: plan.active } });
  return NextResponse.json({ plan }, { status: 201 });
}
