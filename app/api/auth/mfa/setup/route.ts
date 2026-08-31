export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createMfaSecret, encryptMfaSecret } from '@/lib/mfa';
import { enforceRateLimit } from '@/lib/rate-limit';

const schema = z.object({ password: z.string().min(1).max(128) }).strict();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await enforceRateLimit(request, { name: 'mfa-setup', limit: 5, windowSeconds: 60 * 60 }, session.user.id);
  if (!limited.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, password: true } });
  if (!user?.password || !await bcrypt.compare(parsed.data.password, user.password)) return NextResponse.json({ error: 'Verification failed' }, { status: 403 });

  const secret = createMfaSecret();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaSecret: encryptMfaSecret(secret), mfaEnabled: false, mfaRecoveryCodes: { set: [] } },
  });
  const uri = `otpauth://totp/${encodeURIComponent(`PAX:${user.email}`)}?secret=${secret}&issuer=${encodeURIComponent('PAX')}&algorithm=SHA1&digits=6&period=30`;
  return NextResponse.json({ secret, uri });
}

