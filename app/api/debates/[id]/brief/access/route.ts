export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getBriefAccess } from '@/lib/brief-access';
import { BRIEF_PRICE_CENTS, BRIEF_PRICE_LABEL, BRIEF_CURRENCY, isPaymentConfigured } from '@/lib/brief-pricing';

// GET — tells the client whether the current user can download this brief,
// and if not, what it costs to unlock. Abstract is always free.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const debate = await prisma.debate.findUnique({
    where: { id: params.id },
    select: { id: true, initiatorId: true, consensusPublishedAt: true, consensusBrief: true },
  });
  if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const adminCheck = await requireAdmin('knowledge.brief.manage');
  const access = await getBriefAccess(session.user.id, { id: debate.id, initiatorId: debate.initiatorId }, adminCheck.ok);

  return NextResponse.json({
    ...access,
    hasBrief: Boolean(debate.consensusBrief),
    isPublished: Boolean(debate.consensusPublishedAt),
    priceCents: BRIEF_PRICE_CENTS,
    priceLabel: BRIEF_PRICE_LABEL,
    currency: BRIEF_CURRENCY,
    paymentConfigured: isPaymentConfigured(),
  });
}
