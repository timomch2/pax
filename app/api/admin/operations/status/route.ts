export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const allowed = await requirePermission('admin.system.manage', { entityType: 'Operations' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const now = new Date();
  const staleHeartbeat = new Date(now.getTime() - 30 * 60 * 1000);
  const [deadLetters, notificationBacklog, quarantinedUploads, failedWebhooks, mismatches, overduePrivacyCases, staleJobs, latestJobs] = await Promise.all([
    prisma.notificationEvent.count({ where: { status: 'DEAD_LETTER' } }),
    prisma.notificationEvent.count({ where: { status: { in: ['PENDING', 'RETRY'] }, availableAt: { lte: now } } }),
    prisma.uploadAsset.count({ where: { status: { in: ['QUARANTINED', 'SCANNING'] } } }),
    prisma.webhookEvent.count({ where: { status: 'FAILED' } }),
    prisma.reconciliationRecord.count({ where: { status: { in: ['MISMATCHED', 'MISSING_INTERNAL', 'MISSING_PROVIDER'] } } }),
    prisma.dataSubjectRequest.count({ where: { status: { notIn: ['COMPLETED', 'PARTIALLY_COMPLETED', 'REJECTED'] }, resolutionDueAt: { lt: now } } }),
    prisma.operationalJobRun.count({ where: { status: 'RUNNING', heartbeatAt: { lt: staleHeartbeat } } }),
    prisma.operationalJobRun.findMany({ orderBy: { startedAt: 'desc' }, distinct: ['jobKey'], take: 20, select: { jobKey: true, status: true, startedAt: true, finishedAt: true, processed: true, failed: true } }),
  ]);
  return NextResponse.json({ checkedAt: now, alerts: { deadLetters, notificationBacklog, quarantinedUploads, failedWebhooks, reconciliationMismatches: mismatches, overduePrivacyCases, staleJobs }, latestJobs });
}
