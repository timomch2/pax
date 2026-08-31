export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enqueueInAppNotification } from '@/lib/notification-service';
import { requirePermission } from '@/lib/authorization';
import { z } from 'zod';

const schema = z.object({ innovationId: z.string().cuid(), amount: z.number().int().nonnegative().optional(), status: z.enum(['INTERESTED', 'COMMITTED']).optional() }).strict();

// Investor expresses interest / commits to an innovation.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowed = await requirePermission('investment.portfolio.manage', { entityType: 'Investment' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid investment interest' }, { status: 400 });
    const { innovationId, amount, status } = parsed.data;

    const innovation = await prisma.innovation.findUnique({ where: { id: innovationId } });
    if (!innovation) {
      return NextResponse.json({ error: 'Innovation not found' }, { status: 404 });
    }

    const existing = await prisma.investment.findFirst({
      where: { investorId: session.user.id, innovationId },
    });

    const newStatus = status === 'COMMITTED' ? 'COMMITTED' : 'INTERESTED';
    const amt = typeof amount === 'number' && amount > 0 ? Math.round(amount) : 0;

    let investment;
    if (existing) {
      investment = await prisma.investment.update({
        where: { id: existing.id },
        data: {
          amount: amt || existing.amount,
          status: newStatus,
          committedAt: newStatus === 'COMMITTED' ? new Date() : existing.committedAt,
        },
      });
    } else {
      investment = await prisma.investment.create({
        data: {
          investorId: session.user.id,
          innovationId,
          amount: amt,
          status: newStatus,
          committedAt: newStatus === 'COMMITTED' ? new Date() : null,
        },
      });
    }

    // Notify the innovation owner.
    await enqueueInAppNotification(prisma, {
      userId: innovation.ownerId,
      templateSlug: 'investment.interest-received',
      variables: { title: newStatus === 'COMMITTED' ? 'New funding commitment' : 'New investor interest', investorName: session.user.name ?? 'An investor', action: newStatus === 'COMMITTED' ? 'committed to' : 'expressed interest in', innovationTitle: innovation.title },
      idempotencyKey: `investment-interest:${investment.id}:${newStatus}`,
    });

    return NextResponse.json({ investment });
  } catch (error: any) {
    console.error('Investor interest error:', error);
    return NextResponse.json({ error: 'Failed to record interest' }, { status: 500 });
  }
}
