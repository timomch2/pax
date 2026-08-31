export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createRecoveryCodes, decryptMfaSecret, hashRecoveryCode, verifyTotp } from '@/lib/mfa';
import { logAudit } from '@/lib/audit';

const schema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { mfaSecret: true, email: true } });
  if (!user?.mfaSecret || !verifyTotp(decryptMfaSecret(user.mfaSecret), parsed.data.code)) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  const recoveryCodes = createRecoveryCodes();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: true,
      mfaRecoveryCodes: { set: recoveryCodes.map(hashRecoveryCode) },
      sessionVersion: { increment: 1 },
    },
  });
  await logAudit({ userId: session.user.id, actorEmail: user.email, action: 'MFA_ENABLED', entityType: 'User', entityId: session.user.id, request });
  return NextResponse.json({ recoveryCodes });
}

