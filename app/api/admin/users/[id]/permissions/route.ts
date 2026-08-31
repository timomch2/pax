export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSIONS } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

const permissionKeys = PERMISSIONS.map(([key]) => key) as [string, ...string[]];
const grantSchema = z.object({
  permissionKey: z.enum(permissionKeys),
  effect: z.enum(['ALLOW', 'DENY']),
  scope: z.enum(['OWN', 'ORGANIZATION', 'ALL']),
  organizationId: z.string().cuid().optional().nullable(),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
}).strict();

async function superAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false as const, status: 401 as const, session: null };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  return user?.isSuperAdmin
    ? { ok: true as const, status: 200 as const, session }
    : { ok: false as const, status: 403 as const, session };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await superAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: admin.status });
  const parsed = grantSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid permission grant' }, { status: 400 });
  if (parsed.data.scope === 'ORGANIZATION' && !parsed.data.organizationId) return NextResponse.json({ error: 'Organization scope requires an organization ID' }, { status: 400 });
  const permission = await prisma.permission.findUnique({ where: { key: parsed.data.permissionKey } });
  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true } });
  if (!permission || !target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.$transaction([
    prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: target.id, permissionId: permission.id } },
      update: {
        effect: parsed.data.effect,
        scope: parsed.data.scope,
        organizationId: parsed.data.organizationId ?? null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        assignedById: admin.session.user.id,
      },
      create: {
        userId: target.id,
        permissionId: permission.id,
        effect: parsed.data.effect,
        scope: parsed.data.scope,
        organizationId: parsed.data.organizationId ?? null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        assignedById: admin.session.user.id,
      },
    }),
    prisma.user.update({ where: { id: target.id }, data: { permissionVersion: { increment: 1 } } }),
  ]);
  await logAudit({
    userId: admin.session.user.id,
    actorEmail: admin.session.user.email,
    action: 'PERMISSION_GRANT_CHANGED',
    entityType: 'User',
    entityId: target.id,
    request,
    context: parsed.data,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await superAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: admin.status });
  const permissionKey = new URL(request.url).searchParams.get('permission');
  if (!permissionKey || !PERMISSIONS.some(([key]) => key === permissionKey)) return NextResponse.json({ error: 'Invalid permission' }, { status: 400 });
  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { userId: params.id, permissionId: permission.id } }),
    prisma.user.update({ where: { id: params.id }, data: { permissionVersion: { increment: 1 } } }),
  ]);
  await logAudit({ userId: admin.session.user.id, actorEmail: admin.session.user.email, action: 'PERMISSION_GRANT_REMOVED', entityType: 'User', entityId: params.id, request, context: { permissionKey } });
  return NextResponse.json({ ok: true });
}

