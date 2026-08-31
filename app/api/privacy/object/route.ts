export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';
import { createDataSubjectRequest } from '@/lib/privacy-cases';

const objectionSchema = z.object({
  scope: z.enum(['MARKETING', 'PROFILE_VISIBILITY', 'CREDIBILITY_SCORE', 'REMINDERS', 'OTHER']),
  reason: z.string().trim().max(4_000).optional(),
}).strict();

/**
 * Right to object and right to restrict processing — DPA 2019 s.26(d) and s.26(e).
 * Lodges the objection on the record so the DPO can act within 30 days.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const parsed = objectionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid objection' }, { status: 400 });
  const { scope, reason } = parsed.data;

  const privacyRequest = await prisma.$transaction(async (tx) => {
    if (scope === 'MARKETING') {
      await tx.consentRecord.updateMany({
        where: { userId, consentType: 'MARKETING', withdrawnAt: null },
        data: { withdrawnAt: new Date(), granted: false },
      });
    }
    return createDataSubjectRequest(tx, { requesterId: userId, type: scope === 'MARKETING' ? 'OBJECTION' : 'RESTRICTION', scope, reason });
  });

  await logAudit({
    userId,
    actorEmail: email,
    action: 'OBJECTION_LODGED',
    entityType: 'User',
    entityId: userId,
    request: req,
    context: { scope, reason: reason || null },
  });

  return NextResponse.json({
    ok: true,
    requestId: privacyRequest.id,
    message:
      'Your objection has been recorded. We acknowledge every request within seven days and resolve it within thirty days.',
  });
}
