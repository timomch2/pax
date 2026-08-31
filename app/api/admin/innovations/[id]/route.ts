export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';
import { computeMatchScore, DEAL_ALERT_THRESHOLD } from '@/lib/match-scoring';
import { enqueueInAppNotification } from '@/lib/notification-service';

const VALID_STATUS = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'COMMUNITY_VALIDATED', 'INVESTOR_READY', 'FUNDED'];

// PATCH — admin can toggle verified badge or move pipeline status.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin('innovation.update');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const body = await req.json();
    const data: any = {};
    if (typeof body.verified === 'boolean') data.verified = body.verified;
    if (typeof body.status === 'string') {
      if (!VALID_STATUS.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      data.status = body.status;
    }
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const innovation = await prisma.innovation.update({
      where: { id: params.id },
      data,
    });

    // Neural Matchmaking deal alerts: when an innovation becomes investor-ready or is
    // verified, notify investors whose mandate strongly matches it (opt-in, non-blocking).
    const becameReady = data.status === 'INVESTOR_READY' || data.verified === true;
    if (becameReady) {
      try {
        const mandates = await prisma.investorMandate.findMany({
          where: { active: true, notifyOnMatch: true },
        });
        const alerts = mandates
          .map((m) => ({ mandate: m, ...computeMatchScore(m, innovation) }))
          .filter((r) => r.score >= DEAL_ALERT_THRESHOLD);
        if (alerts.length > 0) {
          await Promise.all(alerts.map((a) => enqueueInAppNotification(prisma, {
            userId: a.mandate.userId,
            templateSlug: 'investment.match-alert',
            variables: { score: a.score, innovationTitle: innovation.title, reasons: a.reasons.slice(0, 2).join('; '), innovationId: innovation.id },
            idempotencyKey: `investment-match:${innovation.id}:${a.mandate.userId}`,
          })));
        }
      } catch (alertErr) {
        console.error('Deal alert dispatch failed (non-blocking):', alertErr);
      }
    }

    return NextResponse.json({
      ok: true,
      innovation: {
        id: innovation.id,
        title: innovation.title,
        status: innovation.status,
        verified: innovation.verified,
      },
    });
  } catch (error: any) {
    console.error('Admin innovation update error:', error);
    return NextResponse.json({ error: 'Failed to update innovation' }, { status: 500 });
  }
}
