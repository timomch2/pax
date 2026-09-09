export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { expandedPracticePath } from '@/lib/practice-legacy';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { paymentStatus } = body ?? {};

    // Verify this billing record belongs to the practitioner
    const record = await prisma.billingRecord.findFirst({
      where: {
        id: params.id,
        appointment: { practitionerId: session.user.id },
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (await expandedPracticePath(session.user.id) || await prisma.practiceReconciliation.findFirst({ where: { sourceKey: `legacy:billing:${record.id}`, status: { not: 'PENDING' } } })) return NextResponse.json({ error: 'Use the practice workspace receipt and adjustment ledger for this record.' }, { status: 409 });

    const updated = await prisma.billingRecord.update({
      where: { id: params.id },
      data: {
        paymentStatus: paymentStatus ?? record.paymentStatus,
        paidAt: paymentStatus === 'PAID' ? new Date() : record?.paidAt ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Billing update error:', error);
    return NextResponse.json({ error: 'Failed to update billing record' }, { status: 500 });
  }
}
