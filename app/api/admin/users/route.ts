export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
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

    const where: any = {};
    if (role) where.role = role;
    if (tier) where.tier = tier;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, name: true, email: true, role: true, tier: true,
        organization: true, paxId: true, hubMember: true, credibilityScore: true,
        createdAt: true,
        _count: { select: { innovations: true, investments: true, gpsEntries: true } },
      },
    });
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
