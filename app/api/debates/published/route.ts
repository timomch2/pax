export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — List all published debates (those with a consensus brief)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const debates = await prisma.debate.findMany({
    where: { status: 'PUBLISHED', consensusPublishedAt: { not: null } },
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
    orderBy: { consensusPublishedAt: 'desc' },
  });

  return NextResponse.json({ debates });
}
