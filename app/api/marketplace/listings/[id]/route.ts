export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/authorization';

// GET — single listing detail
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: params.id },
      include: {
        vendor: { select: { id: true, userId: true, corporateName: true, tradingName: true, country: true, contactEmail: true, contactPhone: true, status: true } },
        reviews: {
          include: { reviewer: { select: { id: true, name: true, image: true, role: true, tier: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const isPublic = listing.isPublished && listing.vendor.status === 'APPROVED';
    if (!isPublic) {
      const auth = await requirePermission('marketplace.listing.manage', {
        ownerId: listing.vendor.userId,
        resourceId: listing.id,
        entityType: 'MarketplaceListing',
      }, _req);
      if (!auth.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { isPaxCertified: _certified, paxCertifiedAt: _certifiedAt, paxCertifiedReason: _certifiedReason, ...safeListing } = listing;
    const { userId: _ownerId, ...safeVendor } = listing.vendor;
    return NextResponse.json({ ...safeListing, vendor: safeVendor });
  } catch (err: unknown) {
    console.error('Listing detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}

// PATCH — update listing (vendor owner only) or admin actions
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: params.id },
      include: { vendor: true },
    });
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const auth = await requirePermission('marketplace.listing.manage', {
      ownerId: listing.vendor.userId,
      resourceId: listing.id,
      entityType: 'MarketplaceListing',
    }, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();

    // Owner or admin: update listing fields
    const allowedFields = ['title', 'description', 'features', 'catalogNumber', 'manufacturer',
      'regionFocus', 'externalUrl', 'imageUrls', 'priceDisplay', 'isPublished'];
    const data: Record<string, unknown> = {};
    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        if (f === 'features' || f === 'imageUrls') {
          data[f] = Array.isArray(body[f]) ? JSON.stringify(body[f]) : body[f];
        } else {
          data[f] = body[f];
        }
      }
    }

    const updated = await prisma.marketplaceListing.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('Listing update error:', err);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

// DELETE — remove listing (vendor owner or admin)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: params.id },
      include: { vendor: true },
    });
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const auth = await requirePermission('marketplace.listing.manage', {
      ownerId: listing.vendor.userId,
      resourceId: listing.id,
      entityType: 'MarketplaceListing',
    }, _req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await prisma.marketplaceListing.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Listing delete error:', err);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
