export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

// GET — all investments across the platform with investor + innovation.
export async function GET() {
  const auth = await requireAdmin('investment.portfolio.manage');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const [investments, agg] = await Promise.all([
      prisma.investment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true, amount: true, status: true, committedAt: true, createdAt: true,
          investor: { select: { id: true, name: true, organization: true } },
          innovation: { select: { id: true, title: true, sector: true } },
        },
      }),
      prisma.investment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
    ]);
    const byStatus: Record<string, { count: number; amount: number }> = {};
    agg.forEach((a) => { byStatus[a.status] = { count: a._count._all, amount: a._sum.amount ?? 0 }; });
    return NextResponse.json({ investments, byStatus });
  } catch (error: any) {
    console.error('Admin investments error:', error);
    return NextResponse.json({ error: 'Failed to load investments' }, { status: 500 });
  }
}
