export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { addressRequiredForTier } from '@/lib/access';

// POST — buyer institutional onboarding
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.marketplaceBuyer.findUnique({ where: { userId: session.user.id } });
    if (existing) return NextResponse.json({ error: 'You already have a buyer profile' }, { status: 409 });

    const { institutionName, entityType, jurisdiction, procurementOfficer, officerTitle, officerEmail,
            accreditationUploadAssetId, acceptedDirectProcurement,
            country, physicalAddress, city, postalCode, phone } = await req.json();

    if (!institutionName || !entityType || !jurisdiction || !procurementOfficer || !officerEmail || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!acceptedDirectProcurement) {
      return NextResponse.json({ error: 'You must accept the direct procurement agreement' }, { status: 400 });
    }

    // Physical address is mandatory for all except free Basic-tier users.
    const tier = (session.user as { tier?: string }).tier;
    if (addressRequiredForTier(tier) && (!physicalAddress || !city || !postalCode || !phone)) {
      return NextResponse.json({ error: 'A full physical address (address, city, postal code) and phone are required for your membership tier' }, { status: 400 });
    }

    const accreditationAsset = accreditationUploadAssetId ? await prisma.uploadAsset.findFirst({
      where: { id: accreditationUploadAssetId, ownerId: session.user.id, purpose: 'VENDOR_DOCUMENT', status: 'CLEAN' },
    }) : null;
    if (accreditationUploadAssetId && !accreditationAsset) return NextResponse.json({ error: 'Accreditation document is unavailable, unsafe, or not owned by you' }, { status: 400 });
    const buyer = await prisma.marketplaceBuyer.create({
      data: {
        userId: session.user.id,
        institutionName, entityType, jurisdiction,
        procurementOfficer, officerTitle, officerEmail,
        accreditationPath: accreditationAsset?.objectKey || null,
        accreditationUploadAssetId: accreditationAsset?.id || null,
        acceptedDirectProcurement,
        country: country || null,
        physicalAddress: physicalAddress || null,
        city: city || null,
        postalCode: postalCode || null,
        phone: phone || null,
      },
    });

    return NextResponse.json(buyer, { status: 201 });
  } catch (err: unknown) {
    console.error('Buyer create error:', err);
    return NextResponse.json({ error: 'Failed to create buyer profile' }, { status: 500 });
  }
}

// GET — current user buyer profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const buyer = await prisma.marketplaceBuyer.findUnique({ where: { userId: session.user.id } });
    return NextResponse.json(buyer);
  } catch (err: unknown) {
    console.error('Buyer fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch buyer' }, { status: 500 });
  }
}
