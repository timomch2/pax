export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeMatchScore } from '@/lib/match-scoring';

// Opportunity discovery: list innovations that are open for investor engagement.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get('sector') ?? undefined;
    const stage = searchParams.get('stage') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const sort = searchParams.get('sort') ?? undefined;

    const where: any = {
      status: { in: ['COMMUNITY_VALIDATED', 'INVESTOR_READY', 'FUNDED'] },
    };
    if (sector && sector !== 'all') where.sector = sector;
    if (stage && stage !== 'all') where.stage = stage;
    if (status && status !== 'all') where.status = status;

    const innovations = await prisma.innovation.findMany({
      where,
      orderBy: [{ verified: 'desc' }, { credibilityScore: 'desc' }],
      include: {
        owner: { select: { name: true, organization: true } },
        _count: { select: { milestones: true, endorsements: true, investments: true } },
      },
    });

    const sectors = await prisma.innovation.findMany({
      where: { status: { in: ['COMMUNITY_VALIDATED', 'INVESTOR_READY', 'FUNDED'] } },
      select: { sector: true },
      distinct: ['sector'],
    });

    // Neural Matchmaking: score each opportunity against the investor's mandate (if set).
    const mandate = await prisma.investorMandate.findUnique({
      where: { userId: session.user.id },
    });

    let scored = innovations.map((inv) => {
      if (!mandate) return { ...inv, matchScore: null as number | null, matchReasons: [] as string[] };
      const { score, reasons } = computeMatchScore(mandate, inv);
      return { ...inv, matchScore: score, matchReasons: reasons };
    });

    if (mandate && sort === 'match') {
      scored = scored.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    }

    return NextResponse.json({
      innovations: scored,
      sectors: sectors.map((s) => s.sector),
      hasMandate: !!mandate,
    });
  } catch (error: any) {
    console.error('Investor opportunities error:', error);
    return NextResponse.json({ error: 'Failed to load opportunities' }, { status: 500 });
  }
}
