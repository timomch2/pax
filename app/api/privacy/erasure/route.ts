export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';
import { createDataSubjectRequest } from '@/lib/privacy-cases';

const erasureSchema = z.object({ reason: z.string().trim().max(4_000).optional() }).strict();

/**
 * Right to erasure — DPA 2019 s.26(g).
 * We do not delete immediately. Some records (invoices for tax, medicine safety
 * reports, the audit trail) are subject to legal retention, so the request is
 * lodged, acknowledged and resolved by the DPO within thirty days.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const parsed = erasureSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid erasure request' }, { status: 400 });
  const { reason } = parsed.data;

  const [invoiceCount, patientCount, reportCount] = await Promise.all([
    prisma.invoice.count({ where: { practitionerId: userId } }),
    prisma.hubPatient.count({ where: { practitionerId: userId } }),
    prisma.adverseDrugReport.count({ where: { reporterId: userId } }),
  ]);

  const retained: string[] = [];
  if (invoiceCount > 0) retained.push(`${invoiceCount} invoice record(s), kept seven years for tax law`);
  if (patientCount > 0) retained.push(`${patientCount} patient record(s) you control as a practitioner, which must be transferred or closed first`);
  if (reportCount > 0) retained.push(`${reportCount} medicine safety report(s), which are de-identified rather than deleted`);

  const privacyRequest = await prisma.$transaction(async (tx) => {
    await tx.consentRecord.updateMany({
      where: { userId, withdrawnAt: null },
      data: { withdrawnAt: new Date(), granted: false },
    });
    return createDataSubjectRequest(tx, {
      requesterId: userId,
      type: 'ERASURE',
      reason,
      retentionExceptions: retained,
    });
  });

  await logAudit({
    userId,
    actorEmail: email,
    action: 'DATA_ERASURE_REQUEST',
    entityType: 'User',
    entityId: userId,
    request: req,
    context: { reason: reason || null, invoiceCount, patientCount, reportCount },
  });
  await logAudit({
    userId,
    actorEmail: email,
    action: 'CONSENT_WITHDRAWN',
    entityType: 'User',
    entityId: userId,
    request: req,
  });

  return NextResponse.json({
    ok: true,
    requestId: privacyRequest.id,
    acknowledgementDueAt: privacyRequest.acknowledgementDueAt,
    resolutionDueAt: privacyRequest.resolutionDueAt,
    retained,
    message:
      'Your erasure request has been lodged and your consents withdrawn. We acknowledge within seven days and resolve within thirty days. Anything we cannot delete will be explained to you in writing.',
  });
}
