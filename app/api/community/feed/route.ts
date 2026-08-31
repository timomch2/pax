export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/community/feed — aggregated feed for the Community Hub landing page.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Active debates (OPEN + CLOSING_SOON), most recent first, max 6
    const activeDebates = await prisma.debate.findMany({
      where: { status: { in: ['OPEN', 'CLOSING_SOON'] } },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 6,
      include: {
        initiator: { select: { id: true, name: true, role: true, tier: true } },
        contributions: {
          where: { moderationStatus: { not: 'REMOVED' } },
          select: { id: true, kind: true, isExpert: true, feasibilityScore: true },
        },
        stances: { select: { reaction: true } },
      },
    });

    // Published consensus briefs, newest first, max 4
    const consensusBriefs = await prisma.debate.findMany({
      where: { status: 'PUBLISHED', consensusPublishedAt: { not: null } },
      orderBy: { consensusPublishedAt: 'desc' },
      take: 4,
      select: {
        id: true,
        title: true,
        type: true,
        healthDomain: true,
        geographyFocus: true,
        feasibilityConsensus: true,
        consensusPublishedAt: true,
        initiator: { select: { name: true } },
        _count: { select: { contributions: true, stances: true } },
      },
    });

    // Featured / community-validated innovations, max 4
    const featuredInnovations = await prisma.innovation.findMany({
      where: { status: { in: ['COMMUNITY_VALIDATED', 'INVESTOR_READY', 'FUNDED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 4,
      select: {
        id: true,
        title: true,
        tagline: true,
        sector: true,
        stage: true,
        verified: true,
        owner: { select: { name: true } },
      },
    });

    // Debates needing field validation — OPEN debates with fewer than 3 contributions
    const callsForValidation = await prisma.debate.findMany({
      where: {
        status: { in: ['OPEN', 'CLOSING_SOON'] },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: {
        _count: { select: { contributions: true } },
        initiator: { select: { name: true } },
      },
    });
    const needsVoices = callsForValidation
      .filter((d) => d._count.contributions < 3)
      .slice(0, 4)
      .map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        healthDomain: d.healthDomain,
        geographyFocus: d.geographyFocus,
        contributionCount: d._count.contributions,
        initiator: d.initiator,
      }));

    // Community stats
    const [totalMembers, totalDebates, totalContributions, publishedCount] = await Promise.all([
      prisma.user.count(),
      prisma.debate.count(),
      prisma.debateContribution.count({ where: { moderationStatus: { not: 'REMOVED' } } }),
      prisma.debate.count({ where: { status: 'PUBLISHED' } }),
    ]);

    // Shape active debates
    const debates = activeDebates.map((d) => {
      const experts = d.contributions.filter((c) => c.isExpert || c.kind === 'EXPERT_OPINION').length;
      const fs = d.contributions.map((c) => c.feasibilityScore).filter((n): n is number => typeof n === 'number');
      const feasibilityAvg = fs.length ? fs.reduce((a, b) => a + b, 0) / fs.length : null;
      return {
        id: d.id,
        type: d.type,
        status: d.status,
        title: d.title,
        healthDomain: d.healthDomain,
        geographyFocus: d.geographyFocus,
        featured: d.featured,
        closesAt: d.closesAt,
        createdAt: d.createdAt,
        initiator: d.initiator,
        responseCount: d.contributions.length,
        expertCount: experts,
        stanceCount: d.stances.length,
        feasibilityAvg,
      };
    });

    return NextResponse.json({
      debates,
      consensusBriefs,
      featuredInnovations,
      needsVoices,
      stats: { totalMembers, totalDebates, totalContributions, publishedCount },
    });
  } catch (error: any) {
    console.error('Community feed error:', error);
    return NextResponse.json({ error: 'Failed to load community feed' }, { status: 500 });
  }
}
