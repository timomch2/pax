export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ENDORSER_TYPES } from '@/lib/gps';
import { recomputeCredibility as recomputeScore } from '@/lib/credibility-server';

// POST — endorse another member's GPS entry. The endorser is always the logged-in
// user (real user linkage); a member cannot endorse their own entry, and each user
// can endorse a given entry only once.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await prisma.gpsEntry.findUnique({ where: { id: params.id } });
    if (!entry) {
      return NextResponse.json({ error: 'GPS entry not found' }, { status: 404 });
    }
    if (entry.userId === session.user.id) {
      return NextResponse.json({ error: 'You cannot endorse your own entry.' }, { status: 400 });
    }

    const body = await req.json();
    const { endorserType, comment } = body ?? {};
    if (!endorserType || !(endorserType in ENDORSER_TYPES)) {
      return NextResponse.json({ error: 'Please choose your relationship to this work.' }, { status: 400 });
    }

    try {
      const endorsement = await prisma.gpsEndorsement.create({
        data: {
          gpsEntryId: params.id,
          endorserId: session.user.id,
          endorserType,
          comment: comment?.trim() || null,
        },
        include: { endorser: { select: { id: true, name: true } } },
      });
      const credibilityScore = await recomputeScore(entry.userId);
      return NextResponse.json({ endorsement, credibilityScore });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return NextResponse.json({ error: 'You have already endorsed this entry.' }, { status: 409 });
      }
      throw err;
    }
  } catch (error: any) {
    console.error('GPS endorsement POST error:', error);
    return NextResponse.json({ error: 'Failed to add endorsement' }, { status: 500 });
  }
}

// DELETE — withdraw the logged-in user's own endorsement of this entry.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const entry = await prisma.gpsEntry.findUnique({ where: { id: params.id } });
    if (!entry) {
      return NextResponse.json({ error: 'GPS entry not found' }, { status: 404 });
    }
    await prisma.gpsEndorsement.deleteMany({
      where: { gpsEntryId: params.id, endorserId: session.user.id },
    });
    const credibilityScore = await recomputeScore(entry.userId);
    return NextResponse.json({ success: true, credibilityScore });
  } catch (error: any) {
    console.error('GPS endorsement DELETE error:', error);
    return NextResponse.json({ error: 'Failed to withdraw endorsement' }, { status: 500 });
  }
}
