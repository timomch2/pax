export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const requests = await prisma.dataSubjectRequest.findMany({
    where: { requesterId: session.user.id },
    select: { id: true, type: true, status: true, scope: true, acknowledgementDueAt: true, resolutionDueAt: true, acknowledgedAt: true, completedAt: true, resolution: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ requests });
}
