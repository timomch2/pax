export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Innovator Business Growth Suite: full picture of the innovator's ventures.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const innovations = await prisma.innovation.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        milestones: { orderBy: { orderIndex: 'asc' } },
        cashFlows: { orderBy: { date: 'asc' } },
        diligenceItems: true,
        endorsements: {
          orderBy: { createdAt: 'desc' },
          include: { endorser: { select: { name: true, organization: true } } },
        },
        investments: {
          include: { investor: { select: { name: true, organization: true } } },
        },
      },
    });

    // Aggregates across all ventures.
    let fundingGoal = 0;
    let fundingRaised = 0;
    let totalInflow = 0;
    let totalOutflow = 0;
    let milestonesTotal = 0;
    let milestonesDone = 0;
    let endorsementCount = 0;
    let credibilitySum = 0;

    innovations.forEach((inv) => {
      fundingGoal += inv.fundingGoal ?? 0;
      fundingRaised += inv.fundingRaised ?? 0;
      credibilitySum += inv.credibilityScore ?? 0;
      endorsementCount += inv.endorsements.length;
      inv.milestones.forEach((m) => {
        milestonesTotal += 1;
        if (m.status === 'VERIFIED' || m.status === 'RELEASED') milestonesDone += 1;
      });
      inv.cashFlows.forEach((c) => {
        if (c.type === 'INFLOW') totalInflow += c.amount ?? 0;
        else totalOutflow += c.amount ?? 0;
      });
    });

    const avgCredibility = innovations.length ? Math.round(credibilitySum / innovations.length) : 0;

    return NextResponse.json({
      innovations,
      summary: {
        ventureCount: innovations.length,
        fundingGoal,
        fundingRaised,
        totalInflow,
        totalOutflow,
        netCash: totalInflow - totalOutflow,
        milestonesTotal,
        milestonesDone,
        endorsementCount,
        avgCredibility,
      },
    });
  } catch (error: any) {
    console.error('Innovator overview error:', error);
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
