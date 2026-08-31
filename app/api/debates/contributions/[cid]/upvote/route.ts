import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recomputeCredibility } from '@/lib/credibility-server';

export const dynamic = 'force-dynamic';

// POST /api/debates/contributions/[cid]/upvote — toggle upvote
export async function POST(req: NextRequest, { params }: { params: { cid: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.contributionUpvote.findUnique({
      where: { contributionId_userId: { contributionId: params.cid, userId: session.user.id } },
    });

    if (existing) {
      await prisma.contributionUpvote.delete({ where: { id: existing.id } });
    } else {
      await prisma.contributionUpvote.create({
        data: { contributionId: params.cid, userId: session.user.id },
      });
    }

    const count = await prisma.contributionUpvote.count({ where: { contributionId: params.cid } });

    // An upvote is peer recognition — refresh the contribution author's Credibility Score.
    const contribution = await prisma.debateContribution.findUnique({
      where: { id: params.cid },
      select: { authorId: true },
    });
    if (contribution?.authorId) await recomputeCredibility(contribution.authorId);

    return NextResponse.json({ upvoted: !existing, count });
  } catch (error: any) {
    console.error('Upvote POST error:', error);
    return NextResponse.json({ error: 'Failed to upvote' }, { status: 500 });
  }
}
