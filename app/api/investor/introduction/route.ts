export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enqueueInAppNotification } from '@/lib/notification-service';
import { requirePermission } from '@/lib/authorization';
import { z } from 'zod';

const schema = z.object({ innovationId: z.string().cuid(), message: z.string().trim().max(800).optional() }).strict();

// Investor requests a DIRECT INTRODUCTION to an innovator.
//
// PAX acts strictly as a passive intermediary: this opens an OFFLINE communication
// line by notifying the innovator with the investor's contact details. PAX never holds
// funds, processes transfers, issues equity, or charges a success / finder fee.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowed = await requirePermission('investment.opportunity.read', { entityType: 'Innovation' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid introduction request' }, { status: 400 });
    const { innovationId, message } = parsed.data;

    const innovation = await prisma.innovation.findUnique({
      where: { id: innovationId },
      select: { id: true, title: true, ownerId: true },
    });
    if (!innovation) {
      return NextResponse.json({ error: 'Innovation not found' }, { status: 404 });
    }

    const investor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, organization: true },
    });

    // Ensure a lightweight Investment record exists so the intro shows in the pipeline.
    const existing = await prisma.investment.findFirst({
      where: { investorId: session.user.id, innovationId },
    });
    if (!existing) {
      await prisma.investment.create({
        data: {
          investorId: session.user.id,
          innovationId,
          status: 'INTERESTED',
        },
      });
    }

    const investorName = `${investor?.name ?? 'An investor'}${investor?.organization ? ` (${investor.organization})` : ''}`;
    await enqueueInAppNotification(prisma, {
      userId: innovation.ownerId,
      templateSlug: 'investment.introduction-request',
      variables: { investorName, innovationTitle: innovation.title, investorEmail: investor?.email ?? 'Available from the investor profile', note: message ? `Note: ${String(message).slice(0, 800)}` : '' },
      idempotencyKey: `investment-introduction:${session.user.id}:${innovation.id}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[investor/introduction POST]', e);
    return NextResponse.json({ error: 'Failed to request introduction' }, { status: 500 });
  }
}
