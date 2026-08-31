export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashOpaqueToken } from '@/lib/auth-tokens';
import { enforceRateLimit } from '@/lib/rate-limit';
import { strongPasswordSchema } from '@/lib/password-policy';
import { logAudit } from '@/lib/audit';

const schema = z.object({ token: z.string().min(20).max(500), password: strongPasswordSchema }).strict();

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { name: 'password-reset-consume', limit: 10, windowSeconds: 60 * 60 });
  if (!limited.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid reset details', details: parsed.error.flatten() }, { status: 400 });

  const tokenHash = hashOpaqueToken(parsed.data.token);
  const token = await prisma.authToken.findFirst({
    where: { tokenHash, purpose: 'PASSWORD_RESET', usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!token) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  const password = await bcrypt.hash(parsed.data.password, 12);
  const changed = await prisma.$transaction(async (tx) => {
    const consumed = await tx.authToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return false;
    await tx.user.update({
      where: { id: token.userId },
      data: {
        password,
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    });
    return true;
  });
  if (!changed) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  await logAudit({ userId: token.user.id, actorEmail: token.user.email, action: 'PASSWORD_RESET', entityType: 'User', entityId: token.user.id, request });
  return NextResponse.json({ ok: true });
}

