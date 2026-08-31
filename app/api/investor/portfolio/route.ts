export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Portfolio monitoring: an investor's investments and aggregate exposure.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const investments = await prisma.investment.findMany({
      where: { investorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        innovation: {
          include: {
            owner: { select: { name: true, organization: true } },
            milestones: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    const committed = investments.filter((i) => i.status === 'COMMITTED' || i.status === 'DISBURSING' || i.status === 'COMPLETED');
    const totalCommitted = committed.reduce((sum, i) => sum + (i.amount ?? 0), 0);
    const activeCount = investments.filter((i) => i.status !== 'DECLINED').length;

    return NextResponse.json({
      investments,
      summary: {
        totalCommitted,
        activeCount,
        interestedCount: investments.filter((i) => i.status === 'INTERESTED').length,
      },
    });
  } catch (error: any) {
    console.error('Investor portfolio error:', error);
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 });
  }
}
