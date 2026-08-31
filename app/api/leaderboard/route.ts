export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET — public leaderboard (top members by credibility score)
export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '50'), 100);

    const users = await prisma.user.findMany({
      where: {
        credibilityScore: { gt: 0 },
        role: { not: 'ADMIN' },
      },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        tier: true,
        credibilityScore: true,
        healthAreas: true,
        country: true,
        _count: {
          select: {
            gpsEntries: true,
            debateContributions: true,
            gpsEndorsementsGiven: true,
          },
        },
      },
      orderBy: { credibilityScore: 'desc' },
      take: limit,
    });

    return NextResponse.json(users);
  } catch (err: unknown) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
