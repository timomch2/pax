export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasTier } from '@/lib/access';
import { requirePermission } from '@/lib/authorization';

// GET — return the current practitioner's Hub eligibility & membership state.
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowed = await requirePermission('hub.patient.read', { entityType: 'PractitionerHub' }, request);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tier: true, hubMember: true, hubJoinedAt: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const isPractitioner = user.role === 'PRACTITIONER' || user.role === 'ADMIN';
    // "After membership" = any paid membership above the free Basic tier.
    const eligible = isPractitioner && hasTier(user.tier as any, 'TIER2_PROFESSIONAL');
    return NextResponse.json({
      role: user.role,
      tier: user.tier,
      isPractitioner,
      eligible,
      hubMember: user.hubMember,
      hubJoinedAt: user.hubJoinedAt,
    });
  } catch (error: any) {
    console.error('Practitioner Hub GET error:', error);
    return NextResponse.json({ error: 'Failed to load Hub status' }, { status: 500 });
  }
}

// POST — join the Practitioners Hub. Requires a practitioner on a paid membership.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allowed = await requirePermission('hub.patient.read', { entityType: 'PractitionerHub' }, request);
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, tier: true, hubMember: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!hasTier(user.tier as any, 'TIER2_PROFESSIONAL')) {
      return NextResponse.json(
        { error: 'A Professional (or higher) membership is required to join the Practitioners Hub.' },
        { status: 403 },
      );
    }
    if (user.hubMember) {
      return NextResponse.json({ ok: true, hubMember: true, alreadyMember: true });
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hubMember: true, hubJoinedAt: new Date() },
    });
    return NextResponse.json({ ok: true, hubMember: true });
  } catch (error: any) {
    console.error('Practitioner Hub POST error:', error);
    return NextResponse.json({ error: 'Failed to join the Practitioners Hub' }, { status: 500 });
  }
}
