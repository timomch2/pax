export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { isServiceKey, serviceAccountSelect, serviceAccountSummary } from '@/lib/service-enrollment';
import { requireAdmin, prisma } from '@/lib/admin';

// GET — list users with optional search + role/tier filters.
export async function GET(req: Request) {
  const auth = await requireAdmin('admin.user.read');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const role = searchParams.get('role') || '';
    const tier = searchParams.get('tier') || '';

    const service = searchParams.get('service');
    const state = searchParams.get('serviceState');
    const access = searchParams.get('serviceAccess');
    if (access && (!service || !['ACTIVE', 'SETUP_REQUIRED', 'LIMITED', 'UNAVAILABLE', 'ACCOUNT_RESTRICTED'].includes(access))) return NextResponse.json({ error: 'Choose a valid service access status' }, { status: 400 });
    if ((service && !isServiceKey(service)) || (state && !['ENABLED', 'DISABLED', 'NOT_ENABLED'].includes(state)) || (state && !service)) return NextResponse.json({ error: 'Choose a valid service and enrollment state' }, { status: 400 });
    const where: any = {};
    if (service) where.services = state === 'NOT_ENABLED' ? { none: { serviceKey: service } } : { some: { serviceKey: service, ...(state ? { state } : {}) } };
    if (role) where.role = role;
    if (tier) where.tier = tier;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = [];
    let cursor: string | undefined;
    do {
    const batch = await prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: access ? 100 : 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        ...serviceAccountSelect,
        id: true, name: true, email: true, role: true, tier: true,
        organization: true, paxId: true, hubMember: true, credibilityScore: true,
        createdAt: true,
        _count: { select: { ...serviceAccountSelect._count.select, innovations: true, investments: true, gpsEntries: true } },
      },
    });
    if (!batch.length) break;
    users.push(...batch.filter(user => !access || serviceAccountSummary(user).some(summary => summary.id === service && summary.access === access)));
    cursor = batch[batch.length - 1].id;
    if (!access || batch.length < 100) break;
    } while (users.length < 200);
    return NextResponse.json({ users: users.slice(0, 200).map(user => ({
      id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier,
      organization: user.organization, paxId: user.paxId, hubMember: user.hubMember,
      credibilityScore: user.credibilityScore, createdAt: user.createdAt, _count: user._count,
      services: serviceAccountSummary(user),
    })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: any) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
