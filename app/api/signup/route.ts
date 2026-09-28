export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generatePaxId } from '@/lib/pax-id';
import { logAudit } from '@/lib/audit';
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from '@/lib/policy-version';
import { signupSchema, recordRegistration } from '@/lib/registration';
import { Prisma } from '@prisma/client';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createOpaqueToken } from '@/lib/auth-tokens';
import { enqueueNotification } from '@/lib/notification-service';
import { verifyTurnstile } from '@/lib/bot-protection';
import { productUrl, productRoutingEnabled } from '@/lib/product-hosts';

export async function POST(req: NextRequest) {
  try {
    const parsed = signupSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid registration details', details: parsed.error.flatten() }, { status: 400 });
    const { email, password, name, phone, physicalAddress, city, postalCode, country, serviceKeys } = parsed.data;
    const rateLimit = await enforceRateLimit(req, { name: 'signup', limit: 5, windowSeconds: 60 * 60, blockSeconds: 60 * 60 }, email);
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } });
    if (!await verifyTurnstile(req, parsed.data.turnstileToken)) return NextResponse.json({ error: 'Bot verification failed' }, { status: 400 });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ ok: true, message: 'If the account can be created, verification instructions will be sent.' }, { status: 202 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userRole = 'MEMBER' as const;
    const paxId = generatePaxId(userRole);

    const accessRole = await prisma.accessRole.findUnique({ where: { key: userRole }, select: { id: true, active: true } });
    if (!accessRole?.active) return NextResponse.json({ error: 'Registration is temporarily unavailable' }, { status: 503 });
    const { token, tokenHash } = createOpaqueToken();
    const expiresMinutes = 30;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        registrationVersion: 1,
        accountOnboardingCompletedAt: new Date(),
        accountWelcomePending: true,
        tier: 'TIER1_BASIC',
        additionalRoles: [],
        phone: phone || null,
        physicalAddress: physicalAddress || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || null,
        paxId,
        consentedAt: new Date(),
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_VERSION,
          accessRoleAssignments: {
            create: { accessRoleId: accessRole.id, scope: 'OWN' },
          },
          notificationPreference: { create: {} },
        },
      });

      await recordRegistration(tx, created.id, serviceKeys, req);
      await tx.authToken.create({
        data: {
          userId: created.id,
          purpose: 'EMAIL_VERIFICATION',
          tokenHash,
          expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
        },
      });
      await enqueueNotification(tx, {
        userId: created.id,
        templateSlug: 'account.email-verification',
        recipient: created.email,
        variables: {
          name: created.name,
          expiresMinutes,
          verificationUrl: productRoutingEnabled() ? productUrl('accounts', `/verify-email?token=${encodeURIComponent(token)}`) : `${req.nextUrl.origin}/verify-email?token=${encodeURIComponent(token)}`,
        },
        idempotencyKey: `email-verification:${created.id}:${tokenHash}`,
        priority: 10,
      });
      return created;
    });

    await logAudit({
      userId: user.id,
      actorEmail: user.email,
      action: 'SIGNUP',
      entityType: 'User',
      entityId: user.id,
      request: req,
      context: { role: user.role },
    });
    await logAudit({
      userId: user.id,
      actorEmail: user.email,
      action: 'CONSENT_GRANTED',
      entityType: 'User',
      entityId: user.id,
      request: req,
      context: { policyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION },
    });

    return NextResponse.json({ ok: true, message: 'If the account can be created, verification instructions will be sent.' }, { status: 202 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ ok: true, message: 'If the account can be created, verification instructions will be sent.' }, { status: 202 });
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
