export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashOpaqueToken } from '@/lib/auth-tokens';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

const schema = z.object({ token: z.string().min(20).max(500) }).strict();

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { name: 'verify-email', limit: 20, windowSeconds: 60 * 60 });
  if (!limited.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });

  const tokenHash = hashOpaqueToken(parsed.data.token);
  const token = await prisma.authToken.findFirst({
    where: { tokenHash, purpose: 'EMAIL_VERIFICATION', usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!token) return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });

  const consumed = await prisma.$transaction(async (tx) => {
    const result = await tx.authToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (result.count !== 1) return false;
    await tx.user.update({
      where: { id: token.userId },
      data: { emailVerified: new Date(), verificationLevel: 'EMAIL_VERIFIED' },
    });
    return true;
  });
  if (!consumed) return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });

  await logAudit({
    userId: token.user.id,
    actorEmail: token.user.email,
    action: 'EMAIL_VERIFIED',
    entityType: 'User',
    entityId: token.user.id,
    request,
  });
  return NextResponse.json({ ok: true });
}

