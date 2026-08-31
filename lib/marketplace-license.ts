// Marketplace vendor licence lifecycle (365-day annual re-verification).
// POLICY: An approved vendor's operating licence on PAX is valid for 365 days.
// When it lapses the vendor is automatically FROZEN and all their listings are
// unpublished until they renew (admin re-approval / renewal). This protects the
// marketplace from vendors trading on expired national licences.

import { prisma } from '@/lib/db';

export const LICENSE_PERIOD_DAYS = 365;

export function licenseExpiryFromNow(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + LICENSE_PERIOD_DAYS);
  return d;
}

// Days remaining until a vendor's licence expires (negative if already expired).
export function daysUntilExpiry(expiry: Date | string | null | undefined): number | null {
  if (!expiry) return null;
  const exp = new Date(expiry).getTime();
  const now = Date.now();
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
}

// Lazy enforcement: freeze any APPROVED vendor whose licence has lapsed and
// unpublish their listings. Safe to call on any marketplace read path.
// Returns the number of vendors that were auto-frozen this pass.
export async function enforceExpiredLicenses(): Promise<number> {
  try {
    const now = new Date();
    const expired = await prisma.marketplaceVendor.findMany({
      where: {
        status: 'APPROVED',
        licenseExpiryDate: { not: null, lt: now },
      },
      select: { id: true },
    });
    if (expired.length === 0) return 0;
    const ids = expired.map((v) => v.id);
    await prisma.$transaction([
      prisma.marketplaceVendor.updateMany({
        where: { id: { in: ids } },
        data: { status: 'FROZEN', frozenAt: now },
      }),
      prisma.marketplaceListing.updateMany({
        where: { vendorId: { in: ids } },
        data: { isPublished: false },
      }),
    ]);
    return ids.length;
  } catch (e) {
    // Never let enforcement break a read path.
    console.error('enforceExpiredLicenses error:', e);
    return 0;
  }
}
