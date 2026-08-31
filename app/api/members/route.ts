export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — directory of members who have built a GPS profile (at least one entry).
// Ordered by credibility so the most-documented impact surfaces first.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await prisma.user.findMany({
      where: { gpsEntries: { some: {} } },
      select: {
        id: true,
        name: true,
        role: true,
        headline: true,
        location: true,
        organization: true,
        healthAreas: true,
        credibilityScore: true,
        _count: { select: { gpsEntries: true } },
      },
      orderBy: [{ credibilityScore: 'desc' }, { name: 'asc' }],
    });

    const members = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      headline: r.headline,
      location: r.location,
      organization: r.organization,
      healthAreas: r.healthAreas,
      credibilityScore: r.credibilityScore,
      entryCount: r._count?.gpsEntries ?? 0,
    }));

    return NextResponse.json(members);
  } catch (error: any) {
    console.error('Members GET error:', error);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}
