export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const updateSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  organization: z.string().trim().min(2).max(160).optional(),
  summary: z.string().trim().min(20).max(3_000).optional(),
  responsibilities: z.string().trim().min(20).max(10_000).optional(),
  requirements: z.string().trim().min(20).max(10_000).optional(),
  healthAreas: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CONSULTANCY', 'INTERNSHIP', 'VOLUNTEER']).optional(),
  workMode: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
  location: z.string().trim().max(160).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  closesAt: z.string().datetime().nullable().optional(),
}).strict();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const job = await prisma.job.findUnique({ where: { id: params.id }, include: { _count: { select: { applications: true } } } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const allowed = await authorizeUser(session.user.id, 'talent.job.read', job.status === 'PUBLISHED' ? { entityType: 'Job', resourceId: job.id } : { ownerId: job.employerId, entityType: 'Job', resourceId: job.id });
  if (!allowed.ok) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const allowed = await authorizeUser(session.user.id, 'talent.job.update', { ownerId: job.employerId, entityType: 'Job', resourceId: job.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid job update', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      ...parsed.data,
      ...(parsed.data.healthAreas ? { healthAreas: [...new Set(parsed.data.healthAreas)] } : {}),
      ...(parsed.data.closesAt !== undefined ? { closesAt: parsed.data.closesAt ? new Date(parsed.data.closesAt) : null } : {}),
      ...(parsed.data.status === 'PUBLISHED' && !job.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });
  await logAudit({ userId: session.user.id, action: 'JOB_UPDATED', entityType: 'Job', entityId: job.id, outcome: 'SUCCESS', request, context: { status: updated.status } });
  return NextResponse.json({ job: updated });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const allowed = await authorizeUser(session.user.id, 'talent.job.delete', { ownerId: job.employerId, entityType: 'Job', resourceId: job.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  await prisma.job.update({ where: { id: job.id }, data: { status: 'ARCHIVED' } });
  await logAudit({ userId: session.user.id, action: 'JOB_ARCHIVED', entityType: 'Job', entityId: job.id, outcome: 'SUCCESS', request });
  return NextResponse.json({ archived: true });
}
