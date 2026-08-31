export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

// GET — List all FLAGGED and REMOVED contributions across debates for the admin moderation queue
export async function GET() {
  const admin = await requireAdmin('debate.moderate');
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: admin.status });

  const items = await prisma.debateContribution.findMany({
    where: { moderationStatus: { in: ['FLAGGED', 'REMOVED'] } },
    include: {
      author: { select: { id: true, name: true, role: true } },
      debate: { select: { id: true, title: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ items });
}
