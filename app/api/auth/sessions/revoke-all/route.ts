export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { sessionVersion: { increment: 1 } } });
  await logAudit({ userId: session.user.id, actorEmail: session.user.email, action: 'SESSIONS_REVOKED', entityType: 'User', entityId: session.user.id, request });
  return NextResponse.json({ ok: true });
}

