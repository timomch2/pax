export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

// GET — platform-wide KPIs + recent activity for the admin overview.
export async function GET() {
  const auth = await requireAdmin('admin.analytics.read');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const [
      totalUsers,
      usersByRole,
      usersByTier,
      hubMembers,
      totalInnovations,
      innovationsByStatus,
      totalInvestments,
      investmentAgg,
      totalChallenges,
      openChallenges,
      totalVault,
      pendingVault,
      totalDrugReports,
      totalFeedback,
      recentUsers,
      recentInnovations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.groupBy({ by: ['tier'], _count: { _all: true } }),
      prisma.user.count({ where: { hubMember: true } }),
      prisma.innovation.count(),
      prisma.innovation.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.investment.count(),
      prisma.investment.aggregate({ _sum: { amount: true } }),
      prisma.challengeBrief.count(),
      prisma.challengeBrief.count({ where: { status: 'OPEN' } }),
      prisma.vaultAccessRequest.count(),
      prisma.vaultAccessRequest.count({ where: { status: { in: ['REQUESTED', 'NDA_SIGNED'] } } }),
      prisma.adverseDrugReport.count(),
      prisma.productFeedback.count(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, name: true, email: true, role: true, tier: true, createdAt: true },
      }),
      prisma.innovation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true, title: true, status: true, sector: true, fundingGoal: true,
          createdAt: true, owner: { select: { name: true } },
        },
      }),
    ]);

    const roleCounts: Record<string, number> = {};
    usersByRole.forEach((r) => { roleCounts[r.role] = r._count._all; });
    const tierCounts: Record<string, number> = {};
    usersByTier.forEach((t) => { tierCounts[t.tier] = t._count._all; });
    const statusCounts: Record<string, number> = {};
    innovationsByStatus.forEach((s) => { statusCounts[s.status] = s._count._all; });

    return NextResponse.json({
      totalUsers,
      roleCounts,
      tierCounts,
      hubMembers,
      totalInnovations,
      statusCounts,
      totalInvestments,
      investmentTotal: investmentAgg._sum.amount ?? 0,
      totalChallenges,
      openChallenges,
      totalVault,
      pendingVault,
      totalDrugReports,
      totalFeedback,
      recentUsers,
      recentInnovations,
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
