export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { exportTalentData } from '@/lib/talent-retention';

/**
 * Right of access and right to data portability.
 * Kenya Data Protection Act 2019 s.26(b) and s.26(f).
 * Returns everything we hold about the signed-in member in machine-readable form.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      practitionerProfile: true,
      consentRecords: true,
      notifications: true,
      innovations: true,
      gpsEntries: true,
      drugReports: true,
      productFeedback: true,
      hubPatients: true,
      hubInvoices: { include: { payers: true } },
      verificationRequests: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { password, mfaSecret, mfaRecoveryCodes, ...safeUser } = user as any;

  const auditTrail = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { action: true, entityType: true, outcome: true, ipAddress: true, createdAt: true },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    generatedBy: 'The Praxis Exchange (PAX)',
    note:
      'This file contains the personal data we hold about you. Records you created about your own patients are included because you are their controller; treat this file as confidential.',
    account: safeUser,
    talent: await exportTalentData(userId),
    recentActivity: auditTrail,
  };

  await logAudit({
    userId,
    actorEmail: user.email,
    action: 'DATA_EXPORT',
    entityType: 'User',
    entityId: userId,
    request: req,
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="pax-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
