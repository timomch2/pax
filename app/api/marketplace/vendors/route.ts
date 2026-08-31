export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { addressRequiredForTier } from '@/lib/access';
import { requirePermission } from '@/lib/authorization';

// POST — create vendor application (onboarding)
export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission('marketplace.vendor.manage', {}, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Check if user already has a vendor profile
    const existing = await prisma.marketplaceVendor.findUnique({ where: { userId: auth.userId } });
    if (existing) return NextResponse.json({ error: 'You already have a vendor application' }, { status: 409 });

    const body = await req.json();
    const {
      corporateName, tradingName, country, registrationNumber, taxId,
      headOfficeAddress, city, postalCode, contactPerson, contactEmail, contactPhone,
      primaryPillar, documents,
      acceptedNoDirectDrugSales, acceptedPureIntermediary,
      acceptedB2BTestKitRestriction, acceptedFullIndemnification, acceptedAIModeration,
    } = body;

    if (!corporateName || !country || !registrationNumber ||
        !contactPerson || !contactEmail || !contactPhone || !primaryPillar) {
      return NextResponse.json({ error: 'Missing required business fields' }, { status: 400 });
    }

    // Physical address is mandatory for all except free Basic-tier users.
    const tier = (await prisma.user.findUnique({ where: { id: auth.userId }, select: { tier: true } }))?.tier;
    if (addressRequiredForTier(tier) && (!headOfficeAddress || !city || !postalCode)) {
      return NextResponse.json({ error: 'A full physical address (address, city, postal code) is required for your membership tier' }, { status: 400 });
    }

    // All 5 legal initials must be accepted
    if (!acceptedNoDirectDrugSales || !acceptedPureIntermediary ||
        !acceptedB2BTestKitRestriction || !acceptedFullIndemnification || !acceptedAIModeration) {
      return NextResponse.json({ error: 'All legal terms must be accepted' }, { status: 400 });
    }

    const uploadAssetIds = Array.isArray(documents) ? documents.map((document: { uploadAssetId?: string }) => document.uploadAssetId).filter(Boolean) as string[] : [];
    const assets = await prisma.uploadAsset.findMany({ where: { id: { in: uploadAssetIds }, ownerId: auth.userId, purpose: 'VENDOR_DOCUMENT', status: 'CLEAN' } });
    if (assets.length !== uploadAssetIds.length) return NextResponse.json({ error: 'One or more documents are unavailable, unsafe, or not owned by you' }, { status: 400 });
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    const vendor = await prisma.marketplaceVendor.create({
      data: {
        userId: auth.userId,
        corporateName, tradingName, country, registrationNumber, taxId,
        headOfficeAddress: headOfficeAddress || '', city: city || null, postalCode: postalCode || null, contactPerson, contactEmail, contactPhone,
        primaryPillar,
        acceptedNoDirectDrugSales, acceptedPureIntermediary,
        acceptedB2BTestKitRestriction, acceptedFullIndemnification, acceptedAIModeration,
        documents: documents?.length ? {
          create: documents.map((d: { docType: string; uploadAssetId: string; expiryDate?: string }) => ({
            docType: d.docType,
            fileName: byId.get(d.uploadAssetId)!.originalFileName,
            cloudStoragePath: byId.get(d.uploadAssetId)!.objectKey,
            contentType: byId.get(d.uploadAssetId)!.actualContentType || byId.get(d.uploadAssetId)!.expectedContentType,
            uploadAssetId: d.uploadAssetId,
            expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
          })),
        } : undefined,
      },
      include: { documents: true },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (err: unknown) {
    console.error('Vendor create error:', err);
    return NextResponse.json({ error: 'Failed to create vendor application' }, { status: 500 });
  }
}

// GET — fetch current user's vendor profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const vendor = await prisma.marketplaceVendor.findUnique({
      where: { userId: session.user.id },
      include: { documents: true, listings: { orderBy: { createdAt: 'desc' } } },
    });

    if (!vendor) return NextResponse.json(null);
    const listings = vendor.listings.map(({ isPaxCertified: _certified, paxCertifiedAt: _certifiedAt, paxCertifiedReason: _certifiedReason, ...listing }) => listing);
    return NextResponse.json({ ...vendor, listings });
  } catch (err: unknown) {
    console.error('Vendor fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}
