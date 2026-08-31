export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

// GET — all challenge briefs with author + response counts.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const challenges = await prisma.challengeBrief.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, title: true, organization: true, healthArea: true, geography: true,
        status: true, deadline: true, createdAt: true,
        author: { select: { id: true, name: true, role: true } },
        _count: { select: { responses: true } },
      },
    });
    return NextResponse.json({ challenges });
  } catch (error: any) {
    console.error('Admin challenges error:', error);
    return NextResponse.json({ error: 'Failed to load challenges' }, { status: 500 });
  }
}
