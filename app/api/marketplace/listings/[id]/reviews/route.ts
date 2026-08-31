export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST — submit a review
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: params.id },
      include: { vendor: true },
    });
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    // Vendor cannot review their own listing
    if (listing.vendor.userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot review your own listing' }, { status: 403 });
    }

    const { rating, comment } = await req.json();
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Upsert review (one per user per listing)
    const review = await prisma.marketplaceReview.upsert({
      where: { listingId_reviewerId: { listingId: params.id, reviewerId: session.user.id } },
      create: { listingId: params.id, reviewerId: session.user.id, rating, comment: comment || null },
      update: { rating, comment: comment || null },
    });

    // Update avg rating
    const agg = await prisma.marketplaceReview.aggregate({
      where: { listingId: params.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.marketplaceListing.update({
      where: { id: params.id },
      data: { avgRating: agg._avg.rating, reviewCount: agg._count.rating },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err: unknown) {
    console.error('Review error:', err);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
