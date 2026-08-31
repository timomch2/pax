export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

const RETENTION_YEARS = 5;

// Retention posture for the safety tables. Reported side-effect data is never
// deleted; once a record passes the retention window it is archived to cloud
// storage and stamped, while staying live in the database.
async function getRetention() {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

  const [reportsTotal, reportsArchived, feedbackTotal, feedbackArchived, oldest, dueNow] =
    await Promise.all([
      prisma.adverseDrugReport.count(),
      prisma.adverseDrugReport.count({ where: { archivedAt: { not: null } } }),
      prisma.productFeedback.count(),
      prisma.productFeedback.count({ where: { archivedAt: { not: null } } }),
      prisma.adverseDrugReport.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      prisma.adverseDrugReport.count({
        where: { createdAt: { lt: cutoff }, archivedAt: null },
      }),
    ]);

  return {
    retentionYears: RETENTION_YEARS,
    reportsTotal,
    reportsArchived,
    feedbackTotal,
    feedbackArchived,
    oldestRecord: oldest?.createdAt ?? null,
    dueForArchive: dueNow,
    deleted: 0,
  };
}

// GET — post-market surveillance data: adverse drug reports + product feedback.
export async function GET() {
  const auth = await requireAdmin('safety.signal.read');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const [drugReports, feedback, severityAgg, retention] = await Promise.all([
      prisma.adverseDrugReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true, drugName: true, severity: true, sideEffects: true,
          patientAge: true, patientGender: true, province: true, country: true,
          createdAt: true, reporter: { select: { name: true } },
        },
      }),
      prisma.productFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true, productName: true, rating: true, isExpertReview: true,
          feedbackTier: true, comment: true, province: true, country: true,
          createdAt: true, reviewer: { select: { name: true } },
        },
      }),
      prisma.adverseDrugReport.groupBy({ by: ['severity'], _count: { _all: true } }),
      getRetention(),
    ]);
    const bySeverity: Record<string, number> = {};
    severityAgg.forEach((s) => { bySeverity[s.severity] = s._count._all; });
    return NextResponse.json({ drugReports, feedback, bySeverity, retention });
  } catch (error: any) {
    console.error('Admin safety error:', error);
    return NextResponse.json({ error: 'Failed to load safety data' }, { status: 500 });
  }
}
