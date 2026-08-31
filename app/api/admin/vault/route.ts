export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

// GET — all vault access requests across the platform (NDA audit trail).
export async function GET() {
  const auth = await requireAdmin('vault.access.review');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const requests = await prisma.vaultAccessRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, status: true, ndaSignedAt: true, innovatorApprovedAt: true,
        innovatorDeniedAt: true, createdAt: true,
        requester: { select: { id: true, name: true, organization: true, role: true } },
        innovation: { select: { id: true, title: true, owner: { select: { name: true } } } },
      },
    });
    const byStatus: Record<string, number> = {};
    requests.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
    return NextResponse.json({ requests, byStatus });
  } catch (error: any) {
    console.error('Admin vault error:', error);
    return NextResponse.json({ error: 'Failed to load vault requests' }, { status: 500 });
  }
}
