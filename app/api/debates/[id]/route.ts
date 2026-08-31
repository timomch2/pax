import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { STANCE_ORDER } from '@/lib/debate';

export const dynamic = 'force-dynamic';

// GET /api/debates/[id] — full detail
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const isAdmin = (session?.user as any)?.role === 'ADMIN';

    const debate = await prisma.debate.findUnique({
      where: { id: params.id },
      include: {
        initiator: { select: { id: true, name: true, role: true, tier: true } },
        devilsAdvocate: { select: { id: true, name: true } },
        contributions: {
          where: isAdmin ? {} : { moderationStatus: { not: 'REMOVED' } },
          orderBy: [{ isDevilsAdvocate: 'desc' }, { createdAt: 'asc' }],
          include: {
            author: { select: { id: true, name: true, role: true, tier: true } },
            upvotes: { select: { userId: true } },
          },
        },
        stances: { select: { reaction: true, userId: true } },
      },
    });

    if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Cross-links to PAX ecosystem (optional)
    let related: any = null;
    if (debate.relatedInnovationId || debate.relatedListingId) {
      related = {};
      if (debate.relatedInnovationId) {
        const inv = await prisma.innovation.findUnique({
          where: { id: debate.relatedInnovationId },
          select: { id: true, title: true, sector: true, stage: true, status: true, verified: true },
        });
        if (inv) related.innovation = inv;
      }
      if (debate.relatedListingId) {
        const listing = await prisma.marketplaceListing.findUnique({
          where: { id: debate.relatedListingId },
          select: { id: true, title: true, pillar: true, isPublished: true },
        });
        if (listing && listing.isPublished) related.listing = listing;
      }
      if (!related.innovation && !related.listing) related = null;
    }

    // Stance distribution
    const distribution: Record<string, number> = {};
    for (const s of STANCE_ORDER) distribution[s] = 0;
    for (const s of debate.stances) distribution[s.reaction] = (distribution[s.reaction] ?? 0) + 1;
    const myStance = userId ? debate.stances.find((s) => s.userId === userId)?.reaction ?? null : null;

    // Feasibility rollup
    const fs = debate.contributions
      .map((c) => c.feasibilityScore)
      .filter((n): n is number => typeof n === 'number');
    const feasibilityAvg = fs.length ? fs.reduce((a, b) => a + b, 0) / fs.length : null;

    const contributions = debate.contributions.map((c) => ({
      id: c.id,
      kind: c.kind,
      body: c.body,
      dimension: c.dimension,
      feasibilityScore: c.feasibilityScore,
      implementationSetting: c.implementationSetting,
      evidenceUrl: c.evidenceUrl,
      isDevilsAdvocate: c.isDevilsAdvocate,
      isExpert: c.isExpert,
      aiGenerated: c.aiGenerated,
      moderationStatus: c.moderationStatus,
      moderationReason: isAdmin ? c.moderationReason : null,
      createdAt: c.createdAt,
      author: c.author,
      upvoteCount: c.upvotes.length,
      upvotedByMe: userId ? c.upvotes.some((u) => u.userId === userId) : false,
    }));

    return NextResponse.json({
      debate: {
        id: debate.id,
        type: debate.type,
        status: debate.status,
        title: debate.title,
        motion: debate.motion,
        healthDomain: debate.healthDomain,
        geographyFocus: debate.geographyFocus,
        anchorType: debate.anchorType,
        anchorReference: debate.anchorReference,
        standardRecommendation: debate.standardRecommendation,
        background: debate.background,
        problemStatement: debate.problemStatement,
        promptGroundTruth: debate.promptGroundTruth,
        promptAdaptation: debate.promptAdaptation,
        promptFeasibility: debate.promptFeasibility,
        featured: debate.featured,
        closesAt: debate.closesAt,
        createdAt: debate.createdAt,
        consensusAbstract: debate.consensusAbstract,
        // Full paid/pilot content is served only by the dedicated entitlement route.
        consensusBrief: null,
        consensusPublishedAt: debate.consensusPublishedAt,
        relatedInnovationId: debate.relatedInnovationId,
        relatedListingId: debate.relatedListingId,
        related,
        initiator: debate.initiator,
        devilsAdvocate: debate.devilsAdvocate,
      },
      contributions,
      distribution,
      stanceTotal: debate.stances.length,
      myStance,
      feasibilityAvg,
      isInitiator: userId === debate.initiatorId,
      isAdmin,
    });
  } catch (error: any) {
    console.error('Debate detail GET error:', error);
    return NextResponse.json({ error: 'Failed to load debate' }, { status: 500 });
  }
}

// PATCH /api/debates/[id] — initiator or admin: status / featured / devil's advocate
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = (session.user as any).role === 'ADMIN';

    const debate = await prisma.debate.findUnique({ where: { id: params.id }, select: { initiatorId: true } });
    if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const isInitiator = debate.initiatorId === session.user.id;
    if (!isInitiator && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const b = await req.json();
    const data: any = {};
    if (typeof b.status === 'string') data.status = b.status;
    if (typeof b.closesAt !== 'undefined') data.closesAt = b.closesAt ? new Date(b.closesAt) : null;
    // Cross-links to PAX ecosystem (initiator or admin)
    if (typeof b.relatedInnovationId !== 'undefined') data.relatedInnovationId = b.relatedInnovationId || null;
    if (typeof b.relatedListingId !== 'undefined') data.relatedListingId = b.relatedListingId || null;
    // featured & devil's advocate assignment are admin-only
    if (isAdmin && typeof b.featured === 'boolean') data.featured = b.featured;
    if (isAdmin && typeof b.devilsAdvocateId !== 'undefined') data.devilsAdvocateId = b.devilsAdvocateId || null;

    const updated = await prisma.debate.update({ where: { id: params.id }, data, select: { id: true } });
    return NextResponse.json({ id: updated.id });
  } catch (error: any) {
    console.error('Debate PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update debate' }, { status: 500 });
  }
}
