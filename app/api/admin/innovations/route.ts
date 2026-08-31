export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAdmin, prisma } from '@/lib/admin';

// GET — list all innovations with owner + funding + status.
export async function GET(req: Request) {
  const auth = await requireAdmin('innovation.read');
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const q = (searchParams.get('q') || '').trim();
    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { sector: { contains: q, mode: 'insensitive' } },
      ];
    }
    const innovations = await prisma.innovation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, title: true, sector: true, stage: true, status: true,
        fundingGoal: true, fundingRaised: true, validationScore: true,
        verified: true, ipTimestampedAt: true, createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { investments: true, vaultAccessRequests: true } },
      },
    });
    return NextResponse.json({ innovations });
  } catch (error: any) {
    console.error('Admin innovations error:', error);
    return NextResponse.json({ error: 'Failed to load innovations' }, { status: 500 });
  }
}
