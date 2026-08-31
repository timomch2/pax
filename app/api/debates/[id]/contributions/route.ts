import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enqueueInAppNotification } from '@/lib/notification-service';
import { canExpertOpinion, DIMENSIONS } from '@/lib/debate';
import { moderateContribution } from '@/lib/debate-moderation';
import { recomputeCredibility } from '@/lib/credibility-server';

export const dynamic = 'force-dynamic';

// POST /api/debates/[id]/contributions — add a written contribution
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tier = (session.user as any).tier;

    const debate = await prisma.debate.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, initiatorId: true, status: true, devilsAdvocateId: true },
    });
    if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (['CLOSED', 'IN_SYNTHESIS', 'PUBLISHED'].includes(debate.status)) {
      return NextResponse.json({ error: 'This debate is closed to new contributions.' }, { status: 403 });
    }

    const b = await req.json();
    const body = String(b.body ?? '').trim();
    if (body.length < 10) {
      return NextResponse.json({ error: 'Please write at least a sentence or two.' }, { status: 400 });
    }

    let kind: 'SHORT_REVIEW' | 'EXPERT_OPINION' = 'SHORT_REVIEW';
    if (b.kind === 'EXPERT_OPINION') {
      if (!canExpertOpinion(tier)) {
        return NextResponse.json(
          { error: 'Expert Opinions require an Expert (Tier 3) membership.' },
          { status: 403 },
        );
      }
      kind = 'EXPERT_OPINION';
    }

    const dimension =
      typeof b.dimension === 'string' && (DIMENSIONS as readonly string[]).includes(b.dimension)
        ? b.dimension
        : null;
    let feasibilityScore: number | null = null;
    if (b.feasibilityScore != null) {
      const n = Number(b.feasibilityScore);
      if (Number.isInteger(n) && n >= 1 && n <= 5) feasibilityScore = n;
    }

    const isExpert = canExpertOpinion(tier);
    const isDevilsAdvocate = debate.devilsAdvocateId === session.user.id;

    // AI moderation — flags only, never hides. Fails open.
    const mod = await moderateContribution(body);

    const contribution = await prisma.debateContribution.create({
      data: {
        debateId: debate.id,
        authorId: session.user.id,
        kind,
        body,
        dimension,
        feasibilityScore,
        implementationSetting: b.implementationSetting ? String(b.implementationSetting) : null,
        evidenceUrl: b.evidenceUrl ? String(b.evidenceUrl) : null,
        isDevilsAdvocate,
        isExpert,
        moderationStatus: mod.status,
        moderationReason: mod.reason,
      },
      select: { id: true },
    });

    // Notify the initiator (unless they are the author).
    if (debate.initiatorId !== session.user.id) {
      await enqueueInAppNotification(prisma, { userId: debate.initiatorId, templateSlug: 'debate.contribution-received', variables: { contributorName: session.user.name ?? 'A member', debateTitle: debate.title, debateId: debate.id }, idempotencyKey: `debate-contribution:${contribution.id}` });
    }

    // Debate contributions feed the author's Credibility Score.
    await recomputeCredibility(session.user.id);

    return NextResponse.json({ id: contribution.id, moderationStatus: mod.status });
  } catch (error: any) {
    console.error('Contribution POST error:', error);
    return NextResponse.json({ error: 'Failed to post contribution' }, { status: 500 });
  }
}
