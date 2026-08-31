export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — a single member's public GPS profile, with every entry's endorsements
// (each linked to the real endorser by name). Annotates whether the viewer owns
// the profile and whether they've already endorsed each entry.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        role: true,
        tier: true,
        headline: true,
        location: true,
        organization: true,
        healthAreas: true,
        linkedinUrl: true,
        credibilityScore: true,
        gpsEntries: {
          orderBy: { createdAt: 'desc' },
          include: {
            endorsements: {
              orderBy: { createdAt: 'asc' },
              include: { endorser: { select: { id: true, name: true } } },
            },
            evidence: {
              select: { id: true, fileName: true, contentType: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const viewerId = session.user.id;
    const isOwner = viewerId === member.id;

    const entries = member.gpsEntries.map((e) => ({
      ...e,
      viewerHasEndorsed: e.endorsements.some((en) => en.endorser?.id === viewerId),
    }));

    const { gpsEntries, ...profile } = member;
    return NextResponse.json({ member: profile, isOwner, entries });
  } catch (error: any) {
    console.error('Member profile GET error:', error);
    return NextResponse.json({ error: 'Failed to load member profile' }, { status: 500 });
  }
}
