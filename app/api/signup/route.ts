export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generatePaxId, generateClinicId } from '@/lib/pax-id';
import { logAudit } from '@/lib/audit';
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from '@/lib/policy-version';
import { z } from 'zod';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createOpaqueToken } from '@/lib/auth-tokens';
import { enqueueNotification } from '@/lib/notification-service';
import { strongPasswordSchema } from '@/lib/password-policy';
import { verifyTurnstile } from '@/lib/bot-protection';

// Patient is no longer a self-registration user type. The 5 PAX user types are below.
const VALID_ROLES = ['PRACTITIONER', 'INNOVATOR', 'INVESTOR', 'EMPLOYER', 'POLICYMAKER'] as const;

const signupSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: strongPasswordSchema,
  name: z.string().trim().min(2).max(120),
  role: z.enum(VALID_ROLES).default('PRACTITIONER'),
  additionalRoles: z.array(z.enum(VALID_ROLES)).max(4).optional().default([]),
  phone: z.string().trim().max(40).optional().nullable(),
  physicalAddress: z.string().trim().max(1000).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  postalCode: z.string().trim().max(40).optional().nullable(),
  country: z.string().trim().min(2).max(120),
  medicalRegNumber: z.string().trim().max(120).optional().nullable(),
  specialty: z.string().trim().max(160).optional().nullable(),
  organization: z.string().trim().max(240).optional().nullable(),
  linkedinUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  headline: z.string().trim().max(240).optional().nullable(),
  consentGiven: z.literal(true),
  turnstileToken: z.string().max(2048).optional().nullable(),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const parsed = signupSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid registration details', details: parsed.error.flatten() }, { status: 400 });
    const { email, password, name, role, additionalRoles, phone, physicalAddress, city, postalCode, country, medicalRegNumber, specialty, organization, linkedinUrl, headline } = parsed.data;
    const rateLimit = await enforceRateLimit(req, { name: 'signup', limit: 5, windowSeconds: 60 * 60, blockSeconds: 60 * 60 }, email);
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } });
    if (!await verifyTurnstile(req, parsed.data.turnstileToken)) return NextResponse.json({ error: 'Bot verification failed' }, { status: 400 });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ ok: true, message: 'If the account can be created, verification instructions will be sent.' }, { status: 202 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userRole = role;
    const paxId = generatePaxId(userRole);

    // Validate additional roles (filter to valid values, exclude primary)
    const validAdditional = additionalRoles.filter((additionalRole) => additionalRole !== userRole);

    const accessRole = await prisma.accessRole.findUnique({ where: { key: userRole }, select: { id: true } });
    if (!accessRole) return NextResponse.json({ error: 'Registration is temporarily unavailable' }, { status: 503 });
    const { token, tokenHash } = createOpaqueToken();
    const expiresMinutes = 30;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
        email,
        password: hashedPassword,
        name,
        role: userRole as any,
        tier: 'TIER1_BASIC',
        additionalRoles: validAdditional,
        phone: phone || null,
        physicalAddress: physicalAddress || null,
        city: city || null,
        postalCode: postalCode || null,
        country: country || null,
        paxId,
        consentedAt: new Date(),
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_VERSION,
        organization: organization || null,
        linkedinUrl: linkedinUrl || null,
        headline: headline || null,
        ...(userRole === 'PRACTITIONER' && medicalRegNumber && specialty
          ? {
              practitionerProfile: {
                create: {
                  medicalRegNumber,
                  specialty,
                  consultationRate: 2500,
                  clinicId: generateClinicId(),
                },
              },
            }
          : {}),
          accessRoleAssignments: {
            create: { accessRoleId: accessRole.id, scope: 'OWN' },
          },
          notificationPreference: { create: {} },
        },
      });

    // Append-only consent ledger (DPA 2019 s.32 proof of consent)
    const fwd = req.headers.get('x-forwarded-for');
    const ipAddress = (fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip')) || null;
    const userAgent = req.headers.get('user-agent') || null;
      await tx.consentRecord.createMany({
        data: [
          {
            userId: created.id,
            consentType: 'PRIVACY_POLICY' as any,
            granted: true,
            policyVersion: PRIVACY_POLICY_VERSION,
            termsVersion: TERMS_VERSION,
            ipAddress,
            userAgent,
          },
          {
            userId: created.id,
            consentType: 'ACCOUNT_TERMS' as any,
            granted: true,
            policyVersion: PRIVACY_POLICY_VERSION,
            termsVersion: TERMS_VERSION,
            ipAddress,
            userAgent,
          },
        ],
      });
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
          verificationUrl: `${req.nextUrl.origin}/verify-email?token=${encodeURIComponent(token)}`,
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
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
