export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';

const actionSchema = z.object({ listingId: z.string().cuid(), action: z.enum(['unpublish', 'publish', 'clearFlag']) }).strict();

// GET — list listings for admin review. ?flagged=true limits to AI-flagged ones.
export async function GET(req: NextRequest) {
  try {
    const allowed = await requirePermission('marketplace.listing.manage', { entityType: 'MarketplaceListing' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });

    const flagged = new URL(req.url).searchParams.get('flagged') === 'true';
    const where = flagged ? { moderationStatus: 'FLAGGED' } : {};

    const listings = await prisma.marketplaceListing.findMany({
      where: where as never,
      include: {
        vendor: { select: { id: true, corporateName: true, tradingName: true, status: true } },
      },
      orderBy: [{ moderationStatus: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return NextResponse.json(listings);
  } catch (err: unknown) {
    console.error('Admin listings error:', err);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

// PATCH — human admin decision on a listing (publish / unpublish / clear flag).
// This is the ONLY path that can act on an AI flag — the AI never hides content.
export async function PATCH(req: NextRequest) {
  try {
    const allowed = await requirePermission('marketplace.listing.manage', { entityType: 'MarketplaceListing' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const parsed = actionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid listing action' }, { status: 400 });
    const { listingId, action } = parsed.data;

    const data: Record<string, unknown> = {};
    if (action === 'unpublish') {
      data.isPublished = false;
    } else if (action === 'publish') {
      data.isPublished = true;
    } else if (action === 'clearFlag') {
      data.moderationStatus = 'OK';
      data.moderationReason = null;
      data.moderationCategories = null;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const listing = await prisma.marketplaceListing.update({ where: { id: listingId }, data });
    return NextResponse.json(listing);
  } catch (err: unknown) {
    console.error('Admin listing action error:', err);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}
