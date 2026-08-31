export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createOpaqueToken } from '@/lib/auth-tokens';
import { enqueueNotification } from '@/lib/notification-service';

const schema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
}).strict();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  const generic = { ok: true, message: 'If an eligible account exists, reset instructions will be sent.' };
  if (!parsed.success) return NextResponse.json(generic, { status: 202 });
  const limited = await enforceRateLimit(request, { name: 'password-reset-request', limit: 5, windowSeconds: 60 * 60 }, parsed.data.email);
  if (!limited.allowed) return NextResponse.json(generic, { status: 202 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.password || user.accountStatus !== 'ACTIVE') return NextResponse.json(generic, { status: 202 });
  const { token, tokenHash } = createOpaqueToken();
  const expiresMinutes = 30;
  await prisma.$transaction(async (tx) => {
    await tx.authToken.create({
      data: {
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        tokenHash,
        expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
      },
    });
    await enqueueNotification(tx, {
      userId: user.id,
      templateSlug: 'account.password-reset',
      recipient: user.email,
      variables: {
        name: user.name,
        expiresMinutes,
        resetUrl: `${new URL(request.url).origin}/reset-password?token=${encodeURIComponent(token)}`,
      },
      idempotencyKey: `password-reset:${user.id}:${tokenHash}`,
      priority: 10,
    });
  });
  return NextResponse.json(generic, { status: 202 });
}

