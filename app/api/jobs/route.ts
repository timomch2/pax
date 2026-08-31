export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const createJobSchema = z.object({
  title: z.string().trim().min(3).max(160),
  organization: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(20).max(3_000),
  responsibilities: z.string().trim().min(20).max(10_000),
  requirements: z.string().trim().min(20).max(10_000),
  healthAreas: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CONSULTANCY', 'INTERNSHIP', 'VOLUNTEER']),
  workMode: z.enum(['ONSITE', 'HYBRID', 'REMOTE']),
  location: z.string().trim().max(160).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  salaryMinMinor: z.number().int().nonnegative().nullable().optional(),
  salaryMaxMinor: z.number().int().nonnegative().nullable().optional(),
  salaryCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  closesAt: z.string().datetime().nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.salaryMinMinor != null && value.salaryMaxMinor != null && value.salaryMaxMinor < value.salaryMinMinor) {
    context.addIssue({ code: 'custom', path: ['salaryMaxMinor'], message: 'Maximum salary must be at least the minimum salary' });
  }
  if ((value.salaryMinMinor != null || value.salaryMaxMinor != null) && !value.salaryCurrency) {
    context.addIssue({ code: 'custom', path: ['salaryCurrency'], message: 'Currency is required when salary is supplied' });
  }
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await authorizeUser(session.user.id, 'talent.job.read', { entityType: 'Job' });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const url = new URL(request.url);
  const mine = url.searchParams.get('mine') === '1';
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 50);
  const jobs = await prisma.job.findMany({
    where: mine
      ? { employerId: session.user.id }
      : { status: 'PUBLISHED', OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { _count: { select: { applications: true } } },
  });
  const hasMore = jobs.length > limit;
  const page = hasMore ? jobs.slice(0, limit) : jobs;
  return NextResponse.json({ jobs: page, nextCursor: hasMore ? page.at(-1)?.id : null });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await authorizeUser(session.user.id, 'talent.job.create', { ownerId: session.user.id, entityType: 'Job' });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = createJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid job', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const job = await prisma.job.create({
    data: {
      employerId: session.user.id,
      ...parsed.data,
      healthAreas: [...new Set(parsed.data.healthAreas)],
      closesAt: parsed.data.closesAt ? new Date(parsed.data.closesAt) : null,
      publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : null,
    },
  });
  await logAudit({ userId: session.user.id, action: 'JOB_CREATED', entityType: 'Job', entityId: job.id, outcome: 'SUCCESS', request, context: { status: job.status } });
  return NextResponse.json({ job }, { status: 201 });
}
