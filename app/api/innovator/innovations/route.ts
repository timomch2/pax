export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createInnovation } from '@/lib/innovation-create';
import { ZodError } from 'zod';
import { requirePermission } from '@/lib/authorization';

// GET — list the innovator's own innovations (lightweight).
export async function GET(request: Request) {
  try {
    const allowed = await requirePermission('innovation.read', { entityType: 'Innovation' }, request);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const innovations = await prisma.innovation.findMany({
      where: { ownerId: allowed.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, tagline: true, sector: true, stage: true, status: true,
        fundingGoal: true, ipHash: true, ipTimestampedAt: true, submittedAt: true,
        ipProtectionLevel: true, selfAssessmentCompleted: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ innovations });
  } catch (error: any) {
    console.error('Innovations GET error:', error);
    return NextResponse.json({ error: 'Failed to load innovations' }, { status: 500 });
  }
}

// POST — create a 2-Pager Innovation Brief with IP protection fields & Tier 2 vault content.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowed = await requirePermission('innovation.create', { entityType: 'Innovation' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const body = await req.json();
    const innovation = await prisma.$transaction(tx => createInnovation(tx, session.user.id, body));

    return NextResponse.json({ innovation });
  } catch (error: any) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error('Innovation POST error:', error);
    return NextResponse.json({ error: 'Failed to save innovation' }, { status: 500 });
  }
}
