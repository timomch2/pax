export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

const permissionKeys = PERMISSIONS.map(([key]) => key) as [string, ...string[]];
const schema = z.object({
  permissionKey: z.enum(permissionKeys),
  reason: z.string().trim().min(20).max(1000),
  durationMinutes: z.number().int().min(5).max(60).default(30),
}).strict();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [actor, parsed] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } }),
    request.json().then((body) => schema.safeParse(body)),
  ]);
  if (!actor?.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid break-glass request' }, { status: 400 });
  const permission = await prisma.permission.findUnique({ where: { key: parsed.data.permissionKey } });
  if (!permission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const expiresAt = new Date(Date.now() + parsed.data.durationMinutes * 60 * 1000);
  await prisma.userPermission.upsert({
    where: { userId_permissionId: { userId: session.user.id, permissionId: permission.id } },
    update: { effect: 'ALLOW', scope: 'ALL', expiresAt, assignedById: session.user.id },
    create: { userId: session.user.id, permissionId: permission.id, effect: 'ALLOW', scope: 'ALL', expiresAt, assignedById: session.user.id },
  });
  await logAudit({
    userId: session.user.id,
    actorEmail: session.user.email,
    action: 'BREAK_GLASS_ACTIVATED',
    entityType: 'Permission',
    entityId: permission.id,
    request,
    context: { permissionKey: parsed.data.permissionKey, reason: parsed.data.reason, expiresAt },
  });
  return NextResponse.json({ ok: true, expiresAt });
}

