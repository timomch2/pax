export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const applySchema = z.object({
  coverLetter: z.string().trim().min(50).max(10_000),
  resumeAssetId: z.string().cuid().nullable().optional(),
}).strict();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const job = await prisma.job.findUnique({ where: { id: params.id }, select: { employerId: true } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const isEmployer = job.employerId === session.user.id;
  const allowed = await authorizeUser(session.user.id, 'talent.application.read', isEmployer ? { entityType: 'JobApplication' } : { ownerId: session.user.id, entityType: 'JobApplication' });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const applications = await prisma.jobApplication.findMany({
    where: isEmployer ? { jobId: params.id } : { jobId: params.id, applicantId: session.user.id },
    select: {
      id: true, applicantId: true, coverLetter: true, resumeAssetId: true, status: true, submittedAt: true, updatedAt: true,
      applicant: { select: { name: true, headline: true, location: true, paxId: true, credibilityScore: true, verificationLevel: true } },
      statusEvents: { select: { fromStatus: true, toStatus: true, note: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { submittedAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ applications });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = await authorizeUser(session.user.id, 'talent.application.create', { ownerId: session.user.id, entityType: 'JobApplication' });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = applySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid application', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const job = await prisma.job.findFirst({ where: { id: params.id, status: 'PUBLISHED', OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] } });
  if (!job) return NextResponse.json({ error: 'Job is not accepting applications' }, { status: 409 });
  if (job.employerId === session.user.id) return NextResponse.json({ error: 'You cannot apply to your own job' }, { status: 400 });
  if (parsed.data.resumeAssetId) {
    const asset = await prisma.uploadAsset.findFirst({
      where: { id: parsed.data.resumeAssetId, ownerId: session.user.id, purpose: 'TALENT_RESUME', status: 'CLEAN' },
      select: { id: true },
    });
    if (!asset) return NextResponse.json({ error: 'Resume is unavailable or has not passed security review' }, { status: 400 });
  }
  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.jobApplication.create({
      data: { jobId: job.id, applicantId: session.user.id, coverLetter: parsed.data.coverLetter, resumeAssetId: parsed.data.resumeAssetId || null },
    });
    await tx.jobApplicationStatusEvent.create({ data: { applicationId: created.id, toStatus: 'SUBMITTED', actorId: session.user.id } });
    return created;
  }).catch(() => null);
  if (!application) return NextResponse.json({ error: 'You have already applied for this job' }, { status: 409 });
  await logAudit({ userId: session.user.id, action: 'JOB_APPLICATION_SUBMITTED', entityType: 'JobApplication', entityId: application.id, outcome: 'SUCCESS', request, context: { jobId: job.id } });
  return NextResponse.json({ application }, { status: 201 });
}
