export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { enqueueNotification } from '@/lib/notification-service';

const statusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED']),
  note: z.string().trim().max(2_000).nullable().optional(),
}).strict();

const transitions: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'INTERVIEW', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'OFFERED', 'REJECTED'],
  INTERVIEW: ['OFFERED', 'REJECTED'],
  OFFERED: ['HIRED', 'REJECTED'],
};

export async function PATCH(request: Request, { params }: { params: { id: string; applicationId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const application = await prisma.jobApplication.findFirst({
    where: { id: params.applicationId, jobId: params.id },
    include: { job: true, applicant: { select: { id: true, name: true, email: true } } },
  });
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  if (application.job.employerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const allowed = await authorizeUser(session.user.id, 'talent.application.update', { entityType: 'JobApplication', resourceId: application.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status update' }, { status: 400 });
  if (!transitions[application.status]?.includes(parsed.data.status)) {
    return NextResponse.json({ error: `Cannot change ${application.status} to ${parsed.data.status}` }, { status: 409 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.jobApplication.update({ where: { id: application.id }, data: { status: parsed.data.status } });
    await tx.jobApplicationStatusEvent.create({
      data: { applicationId: application.id, fromStatus: application.status, toStatus: parsed.data.status, actorId: session.user.id, note: parsed.data.note || null },
    });
    await enqueueNotification(tx, {
      userId: application.applicant.id,
      templateSlug: 'talent.application-status',
      recipient: application.applicant.email,
      variables: {
        applicantName: application.applicant.name,
        jobTitle: application.job.title,
        organization: application.job.organization,
        status: parsed.data.status.replace(/_/g, ' ').toLowerCase(),
      },
      idempotencyKey: `job-application:${application.id}:status:${parsed.data.status}`,
    });
    return result;
  });
  await logAudit({ userId: session.user.id, action: 'JOB_APPLICATION_STATUS_CHANGED', entityType: 'JobApplication', entityId: application.id, outcome: 'SUCCESS', request, context: { from: application.status, to: updated.status } });
  return NextResponse.json({ application: updated });
}

export async function DELETE(request: Request, { params }: { params: { id: string; applicationId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const application = await prisma.jobApplication.findFirst({ where: { id: params.applicationId, jobId: params.id, applicantId: session.user.id } });
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) return NextResponse.json({ error: 'Application cannot be withdrawn' }, { status: 409 });
  const allowed = await authorizeUser(session.user.id, 'talent.application.update', { ownerId: session.user.id, entityType: 'JobApplication', resourceId: application.id });
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  await prisma.$transaction([
    prisma.jobApplication.update({ where: { id: application.id }, data: { status: 'WITHDRAWN', withdrawnAt: new Date() } }),
    prisma.jobApplicationStatusEvent.create({ data: { applicationId: application.id, fromStatus: application.status, toStatus: 'WITHDRAWN', actorId: session.user.id } }),
  ]);
  await logAudit({ userId: session.user.id, action: 'JOB_APPLICATION_WITHDRAWN', entityType: 'JobApplication', entityId: application.id, outcome: 'SUCCESS', request });
  return NextResponse.json({ withdrawn: true });
}
