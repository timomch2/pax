export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from '@/lib/policy-version';

/** Consent history and withdrawal — DPA 2019 s.32. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const records = await prisma.consentRecord.findMany({
    where: { userId },
    orderBy: { grantedAt: 'desc' },
  });
  return NextResponse.json({ records, currentPolicyVersion: PRIVACY_POLICY_VERSION });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const email = (session?.user as any)?.email as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { consentType, granted } = (await req.json().catch(() => ({}))) as {
    consentType?: string;
    granted?: boolean;
  };
  const allowed = ['MARKETING', 'HEALTH_DATA_PROCESSING', 'CROSS_BORDER_TRANSFER', 'PRIVACY_POLICY', 'ACCOUNT_TERMS'];
  if (!consentType || !allowed.includes(consentType)) {
    return NextResponse.json({ error: 'Unknown consent type.' }, { status: 400 });
  }

  const fwd = req.headers.get('x-forwarded-for');
  const ipAddress = (fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip')) || null;
  const userAgent = req.headers.get('user-agent') || null;

  if (granted) {
    await prisma.consentRecord.create({
      data: {
        userId,
        consentType: consentType as any,
        granted: true,
        policyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_VERSION,
        ipAddress,
        userAgent,
      },
    });
  } else {
    await prisma.consentRecord.updateMany({
      where: { userId, consentType: consentType as any, withdrawnAt: null },
      data: { withdrawnAt: new Date(), granted: false },
    });
  }

  await logAudit({
    userId,
    actorEmail: email,
    action: granted ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN',
    entityType: 'ConsentRecord',
    request: req,
    context: { consentType },
  });

  return NextResponse.json({ ok: true });
}
