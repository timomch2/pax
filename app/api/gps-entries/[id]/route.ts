export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recomputeCredibility as recomputeScore } from '@/lib/credibility-server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = await prisma.gpsEntry.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const body = await req.json();
    const { title, organization, entryType, healthArea, geography, periodStart, periodEnd, gap, rootCause, solution, outcome, lessonsLearned } = body ?? {};

    const entry = await prisma.gpsEntry.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(organization !== undefined ? { organization: organization?.trim() || null } : {}),
        ...(entryType !== undefined ? { entryType } : {}),
        ...(healthArea !== undefined ? { healthArea: healthArea?.trim() || null } : {}),
        ...(geography !== undefined ? { geography: geography?.trim() || null } : {}),
        ...(periodStart !== undefined ? { periodStart: periodStart?.trim() || null } : {}),
        ...(periodEnd !== undefined ? { periodEnd: periodEnd?.trim() || null } : {}),
        ...(gap !== undefined ? { gap: gap.trim() } : {}),
        ...(rootCause !== undefined ? { rootCause: rootCause?.trim() || null } : {}),
        ...(solution !== undefined ? { solution: solution.trim() } : {}),
        ...(outcome !== undefined ? { outcome: outcome.trim() } : {}),
        ...(lessonsLearned !== undefined ? { lessonsLearned: lessonsLearned?.trim() || null } : {}),
      },
    });
    const credibilityScore = await recomputeScore(session.user.id);
    return NextResponse.json({ entry, credibilityScore });
  } catch (error: any) {
    console.error('GPS entry PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update GPS entry' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const existing = await prisma.gpsEntry.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.gpsEntry.delete({ where: { id: params.id } });
    const credibilityScore = await recomputeScore(session.user.id);
    return NextResponse.json({ success: true, credibilityScore });
  } catch (error: any) {
    console.error('GPS entry DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete GPS entry' }, { status: 500 });
  }
}
