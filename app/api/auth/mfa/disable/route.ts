export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyAndConsumeSecondFactor } from '@/lib/mfa';
import { logAudit } from '@/lib/audit';

const schema = z.object({ password: z.string().min(1).max(128), code: z.string().min(6).max(30) }).strict();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const verified = Boolean(user?.password && user.mfaEnabled && user.mfaSecret &&
    await bcrypt.compare(parsed.data.password, user.password) &&
    await verifyAndConsumeSecondFactor(user.id, user.mfaSecret, user.mfaRecoveryCodes, parsed.data.code));
  if (!verified || !user) return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: { set: [] }, sessionVersion: { increment: 1 } },
  });
  await logAudit({ userId: user.id, actorEmail: user.email, action: 'MFA_DISABLED', entityType: 'User', entityId: user.id, request });
  return NextResponse.json({ ok: true });
}

