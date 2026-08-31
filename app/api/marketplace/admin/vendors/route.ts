export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { enforceExpiredLicenses, licenseExpiryFromNow } from '@/lib/marketplace-license';

const actionSchema = z.object({ vendorId: z.string().cuid(), action: z.enum(['approve', 'renew', 'reject', 'freeze', 'unfreeze']), adminNotes: z.string().trim().max(4_000).nullable().optional() }).strict();

// GET — list all vendors (admin)
export async function GET(req: NextRequest) {
  try {
    const allowed = await requirePermission('marketplace.vendor.approve', { entityType: 'MarketplaceVendor' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });

    // Auto-freeze any vendors whose 365-day licence has lapsed before listing.
    await enforceExpiredLicenses();

    const status = new URL(req.url).searchParams.get('status');
    const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'FROZEN' } : {};

    const vendors = await prisma.marketplaceVendor.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, tier: true } },
        documents: true,
        _count: { select: { listings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(vendors);
  } catch (err: unknown) {
    console.error('Admin vendors error:', err);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

// PATCH — approve/reject/freeze a vendor
export async function PATCH(req: NextRequest) {
  try {
    const allowed = await requirePermission('marketplace.vendor.approve', { entityType: 'MarketplaceVendor' }, req);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const parsed = actionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid vendor action' }, { status: 400 });
    const { vendorId, action, adminNotes } = parsed.data;

    const data: Record<string, unknown> = { adminNotes: adminNotes || null };

    if (action === 'approve') {
      data.status = 'APPROVED';
      data.approvedAt = new Date();
      data.frozenAt = null;
      // Start / restart the 365-day licence validity clock on approval.
      data.licenseExpiryDate = licenseExpiryFromNow();
    } else if (action === 'renew') {
      // Annual licence renewal — extend 365 days and reinstate if it was frozen.
      data.status = 'APPROVED';
      data.frozenAt = null;
      data.licenseExpiryDate = licenseExpiryFromNow();
    } else if (action === 'reject') {
      data.status = 'REJECTED';
    } else if (action === 'freeze') {
      data.status = 'FROZEN';
      data.frozenAt = new Date();
      // Unpublish all listings
      await prisma.marketplaceListing.updateMany({ where: { vendorId }, data: { isPublished: false } });
    } else if (action === 'unfreeze') {
      data.status = 'APPROVED';
      data.frozenAt = null;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const vendor = await prisma.marketplaceVendor.update({ where: { id: vendorId }, data });
    return NextResponse.json(vendor);
  } catch (err: unknown) {
    console.error('Admin vendor action error:', err);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}
