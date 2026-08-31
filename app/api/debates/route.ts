import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canInitiate, DEFAULT_PROMPTS, OPEN_STATUSES } from '@/lib/debate';

export const dynamic = 'force-dynamic';

// GET /api/debates?type=&status=&q=&mine=1&featured=1
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const sp = new URL(req.url).searchParams;
    const type = sp.get('type');
    const status = sp.get('status');
    const q = sp.get('q');
    const mine = sp.get('mine');
    const featured = sp.get('featured');

    const where: any = {};
    if (type) where.type = type;
    if (status === 'open') where.status = { in: OPEN_STATUSES };
    else if (status) where.status = status;
    if (featured === '1') where.featured = true;
    if (mine === '1' && userId) where.initiatorId = userId;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { motion: { contains: q, mode: 'insensitive' } },
        { problemStatement: { contains: q, mode: 'insensitive' } },
      ];
    }

    const debates = await prisma.debate.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      include: {
        initiator: { select: { id: true, name: true, role: true, tier: true } },
        devilsAdvocate: { select: { id: true, name: true } },
        contributions: {
          where: { moderationStatus: { not: 'REMOVED' } },
          select: { id: true, kind: true, isExpert: true, feasibilityScore: true },
        },
        stances: { select: { reaction: true } },
      },
    });

    const list = debates.map((d) => {
      const experts = d.contributions.filter((c) => c.isExpert || c.kind === 'EXPERT_OPINION').length;
      const fs = d.contributions.map((c) => c.feasibilityScore).filter((n): n is number => typeof n === 'number');
      const feasibilityAvg = fs.length ? fs.reduce((a, b) => a + b, 0) / fs.length : null;
      return {
        id: d.id,
        type: d.type,
        status: d.status,
        title: d.title,
        motion: d.motion,
        healthDomain: d.healthDomain,
        geographyFocus: d.geographyFocus,
        featured: d.featured,
        closesAt: d.closesAt,
        createdAt: d.createdAt,
        initiator: d.initiator,
        devilsAdvocate: d.devilsAdvocate,
        responseCount: d.contributions.length,
        expertCount: experts,
        stanceCount: d.stances.length,
        feasibilityAvg,
      };
    });

    return NextResponse.json({ debates: list });
  } catch (error: any) {
    console.error('Debates GET error:', error);
    return NextResponse.json({ error: 'Failed to load debates' }, { status: 500 });
  }
}

// POST /api/debates — create a debate (Tier 2+)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tier = (session.user as any).tier;
    if (!canInitiate(tier)) {
      return NextResponse.json(
        { error: 'Initiating a debate requires a Professional (Tier 2) membership or higher.' },
        { status: 403 },
      );
    }

    const b = await req.json();
    const title = String(b.title ?? '').trim();
    const motion = String(b.motion ?? '').trim();
    const problemStatement = String(b.problemStatement ?? '').trim();
    const type = String(b.type ?? '').trim();
    if (!title || !motion || !problemStatement || !type) {
      return NextResponse.json(
        { error: 'Title, debate type, motion and problem statement are required.' },
        { status: 400 },
      );
    }
    if (!['POLICY_PRACTICE', 'RESEARCH_FEASIBILITY', 'INNOVATION_PILOT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid debate type.' }, { status: 400 });
    }

    const debate = await prisma.debate.create({
      data: {
        initiatorId: session.user.id,
        type: type as any,
        status: 'OPEN',
        title,
        motion,
        problemStatement,
        healthDomain: b.healthDomain ? String(b.healthDomain) : null,
        geographyFocus: b.geographyFocus ? String(b.geographyFocus) : null,
        anchorType: b.anchorType ? String(b.anchorType) : null,
        anchorReference: b.anchorReference ? String(b.anchorReference) : null,
        standardRecommendation: b.standardRecommendation ? String(b.standardRecommendation) : null,
        background: b.background ? String(b.background) : null,
        promptGroundTruth: (b.promptGroundTruth ? String(b.promptGroundTruth) : DEFAULT_PROMPTS.groundTruth),
        promptAdaptation: (b.promptAdaptation ? String(b.promptAdaptation) : DEFAULT_PROMPTS.adaptation),
        promptFeasibility: (b.promptFeasibility ? String(b.promptFeasibility) : DEFAULT_PROMPTS.feasibility),
        closesAt: b.closesAt ? new Date(b.closesAt) : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: debate.id });
  } catch (error: any) {
    console.error('Debates POST error:', error);
    return NextResponse.json({ error: 'Failed to create debate' }, { status: 500 });
  }
}
