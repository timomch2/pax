export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { enforceExpiredLicenses } from '@/lib/marketplace-license';

// GET — aggregate marketplace stats for the admin dashboard.
export async function GET(request: Request) {
  try {
    const allowed = await requirePermission('marketplace.vendor.approve', { entityType: 'Marketplace' }, request);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });

    await enforceExpiredLicenses();

    const [vendorGroups, listingTotal, listingPublished, listingFlagged, buyerCount] = await Promise.all([
      prisma.marketplaceVendor.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.marketplaceListing.count(),
      prisma.marketplaceListing.count({ where: { isPublished: true } }),
      prisma.marketplaceListing.count({ where: { moderationStatus: 'FLAGGED' } }),
      prisma.marketplaceBuyer.count(),
    ]);

    const vendorsByStatus: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, FROZEN: 0 };
    for (const g of vendorGroups) vendorsByStatus[g.status] = g._count._all;

    return NextResponse.json({
      vendors: {
        total: vendorGroups.reduce((s, g) => s + g._count._all, 0),
        byStatus: vendorsByStatus,
      },
      listings: {
        total: listingTotal,
        published: listingPublished,
        flagged: listingFlagged,
      },
      buyers: { total: buyerCount },
      marketplacePolicy: { transactionsOnPlatform: false, platformFees: false },
    });
  } catch (err: unknown) {
    console.error('Admin marketplace stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
