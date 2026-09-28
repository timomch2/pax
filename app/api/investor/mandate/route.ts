export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { investorMandateSchema } from '@/lib/investor-mandate-input';

// GET the current investor's mandate (null if not yet set).
export async function GET(request: Request) {
  try {
    const allowed = await requirePermission('investment.mandate.manage', { entityType: 'InvestorMandate' }, request);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const mandate = await prisma.investorMandate.findUnique({
      where: { userId: allowed.userId },
    });
    return NextResponse.json({ mandate });
  } catch (e) {
    console.error('[investor/mandate GET]', e);
    return NextResponse.json({ error: 'Failed to load mandate' }, { status: 500 });
  }
}

// PUT (upsert) the current investor's mandate.
export async function PUT(req: NextRequest) {
  try {
    const allowed = await requirePermission('investment.mandate.manage', { entityType: 'InvestorMandate' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });

    const body = await req.json();
    const parsed = investorMandateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const data = parsed.data;

    const mandate = await prisma.investorMandate.upsert({
      where: { userId: allowed.userId },
      create: { userId: allowed.userId, ...data },
      update: data,
    });

    return NextResponse.json({ mandate });
  } catch (e) {
    console.error('[investor/mandate PUT]', e);
    return NextResponse.json({ error: 'Failed to save mandate' }, { status: 500 });
  }
}
