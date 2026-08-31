export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { moderateListing } from '@/lib/marketplace-moderation';
import { enforceExpiredLicenses } from '@/lib/marketplace-license';

// GET — browse listings (public, filtered)
export async function GET(req: NextRequest) {
  try {
    // Freeze vendors on lapsed licences so their listings drop out of the browse.
    await enforceExpiredLicenses();
    const { searchParams } = new URL(req.url);
    const pillar = searchParams.get('pillar');
    const listingType = searchParams.get('type');
    const region = searchParams.get('region');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 12;

    const where: Record<string, unknown> = { isPublished: true };
    // Only show listings from approved vendors
    where.vendor = { status: 'APPROVED' };

    if (pillar) where.pillar = pillar;
    if (listingType) where.listingType = listingType;
    if (region) where.regionFocus = { contains: region, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where: where as never,
        include: {
          vendor: { select: { id: true, corporateName: true, tradingName: true, country: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketplaceListing.count({ where: where as never }),
    ]);

    const publicListings = listings.map(({ isPaxCertified: _certified, paxCertifiedAt: _certifiedAt, paxCertifiedReason: _certifiedReason, ...listing }) => listing);
    return NextResponse.json({ listings: publicListings, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    console.error('Listing browse error:', err);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

// POST — create a listing (vendor only, approved)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const vendor = await prisma.marketplaceVendor.findUnique({ where: { userId: session.user.id } });
    if (!vendor) return NextResponse.json({ error: 'No vendor profile found' }, { status: 403 });
    if (vendor.status !== 'APPROVED') return NextResponse.json({ error: 'Vendor not yet approved' }, { status: 403 });

    const body = await req.json();
    const { pillar, listingType, title, description, features, catalogNumber, manufacturer,
            regionFocus, externalUrl, imageUrls, priceDisplay } = body;

    if (!title || !description || !pillar || !listingType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // AI content moderation — FLAG only. Listing stays published; a human admin
    // reviews anything flagged. Fails open (OK) if the AI is unavailable.
    const moderation = await moderateListing(title, description);

    const listing = await prisma.marketplaceListing.create({
      data: {
        vendorId: vendor.id,
        pillar, listingType, title, description,
        features: features ? JSON.stringify(features) : null,
        catalogNumber, manufacturer, regionFocus, externalUrl,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,
        priceDisplay,
        isPublished: true,
        moderationStatus: moderation.status,
        moderationReason: moderation.reason,
        moderationCategories: moderation.categories.length ? JSON.stringify(moderation.categories) : null,
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (err: unknown) {
    console.error('Listing create error:', err);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}
