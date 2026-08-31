export const dynamic = 'force-dynamic';

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/bot-protection';
import { enqueueNotification } from '@/lib/notification-service';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(10_000),
  website: z.string().max(0).optional().default(''),
  turnstileToken: z.string().max(2048).optional().nullable(),
}).strict();

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid form details' }, { status: 400 });
    const limited = await enforceRateLimit(request, { name: 'contact', limit: 5, windowSeconds: 15 * 60, blockSeconds: 60 * 60 }, parsed.data.email);
    if (!limited.allowed) return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    if (!await verifyTurnstile(request, parsed.data.turnstileToken)) return NextResponse.json({ success: false, message: 'Bot verification failed' }, { status: 400 });

    await enqueueNotification(prisma, {
      templateSlug: 'contact.submission',
      recipient: 'praxis@thepraxisexchange.com',
      variables: {
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
      idempotencyKey: `contact:${randomUUID()}`,
    });
    return NextResponse.json({ success: true, message: 'Submitted' }, { status: 202 });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json({ success: false, message: 'Failed to submit message. Please email us directly.' }, { status: 500 });
  }
}

