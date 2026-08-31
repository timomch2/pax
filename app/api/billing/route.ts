export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billingRecords = await prisma.billingRecord.findMany({
      where: {
        appointment: {
          practitionerId: session.user.id,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          select: {
            dateTime: true,
            type: true,
            location: true,
            patient: { select: { name: true } },
          },
        },
      },
    });

    const totalBilled = (billingRecords ?? []).reduce((sum: number, r: any) => sum + (r?.amount ?? 0), 0);
    const totalCollected = (billingRecords ?? []).filter((r: any) => r?.paymentStatus === 'PAID').reduce((sum: number, r: any) => sum + (r?.amount ?? 0), 0);
    const outstanding = totalBilled - totalCollected;

    return NextResponse.json({
      records: billingRecords ?? [],
      summary: { totalBilled, totalCollected, outstanding },
    });
  } catch (error: any) {
    console.error('Billing GET error:', error);
    return NextResponse.json({ error: 'Failed to load billing' }, { status: 500 });
  }
}
