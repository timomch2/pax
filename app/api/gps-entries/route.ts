export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recomputeCredibility as recomputeScore } from '@/lib/credibility-server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const entries = await prisma.gpsEntry.findMany({
      where: { userId: session.user.id },
      include: {
        endorsements: {
          select: {
            id: true,
            endorserType: true,
            comment: true,
            createdAt: true,
            endorser: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        evidence: {
          select: { id: true, fileName: true, contentType: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('GPS entries GET error:', error);
    return NextResponse.json({ error: 'Failed to load GPS entries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { title, organization, entryType, healthArea, geography, periodStart, periodEnd, gap, rootCause, solution, outcome, lessonsLearned } = body ?? {};

    if (!title?.trim() || !gap?.trim() || !solution?.trim() || !outcome?.trim()) {
      return NextResponse.json({ error: 'Title, Gap, Solution and Outcome are required.' }, { status: 400 });
    }

    const entry = await prisma.gpsEntry.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        organization: organization?.trim() || null,
        entryType: entryType || 'FORMAL_ROLE',
        healthArea: healthArea?.trim() || null,
        geography: geography?.trim() || null,
        periodStart: periodStart?.trim() || null,
        periodEnd: periodEnd?.trim() || null,
        gap: gap.trim(),
        rootCause: rootCause?.trim() || null,
        solution: solution.trim(),
        outcome: outcome.trim(),
        lessonsLearned: lessonsLearned?.trim() || null,
      },
    });
    const credibilityScore = await recomputeScore(session.user.id);
    return NextResponse.json({ entry, credibilityScore });
  } catch (error: any) {
    console.error('GPS entry POST error:', error);
    return NextResponse.json({ error: 'Failed to create GPS entry' }, { status: 500 });
  }
}
