export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { extractThemes } from '@/lib/consensus-brief';

// POST — Run thematic analysis on a debate's contributions (admin only)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin('debate.moderate');
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: admin.status });

  const debate = await prisma.debate.findUnique({
    where: { id: params.id },
    include: {
      contributions: {
        where: { moderationStatus: { not: 'REMOVED' } },
        select: { body: true, dimension: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const themes = await extractThemes(debate.contributions);
  return NextResponse.json({ themes });
}
