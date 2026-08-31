export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireHubPractitioner, prisma } from '@/lib/hub';
import { ageingBucket, AGEING_ORDER, daysOverdue, type AgeingBucket } from '@/lib/hub-finance';

// GET — finance dashboard aggregates for the current practitioner.
export async function GET() {
  const auth = await requireHubPractitioner('hub.invoice.read');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const invoices = await prisma.invoice.findMany({
    where: { practitionerId: auth.userId, status: { not: 'DRAFT' } },
    include: { payers: true },
  });

  let totalBilled = 0;
  let totalCollected = 0;
  const ageing: Record<AgeingBucket, number> = {
    CURRENT: 0, D1_30: 0, D31_60: 0, D61_90: 0, D90_PLUS: 0,
  };
  const debtorMap = new Map<string, { name: string; type: string; outstanding: number; oldestDays: number }>();
  const now = new Date();
  let overdueLines = 0;

  for (const inv of invoices) {
    totalBilled += inv.totalAmount;
    for (const p of inv.payers) {
      totalCollected += p.amountPaid;
      const outstanding = Math.max(0, p.amount - p.amountPaid);
      if (outstanding > 0) {
        const bucket = ageingBucket(p.dueDate, now);
        ageing[bucket] += outstanding;
        const dOver = daysOverdue(p.dueDate, now);
        if (dOver > 0) overdueLines++;
        const key = `${p.payerType}::${p.payerName.toLowerCase()}`;
        const existing = debtorMap.get(key);
        if (existing) {
          existing.outstanding += outstanding;
          existing.oldestDays = Math.max(existing.oldestDays, dOver);
        } else {
          debtorMap.set(key, { name: p.payerName, type: p.payerType, outstanding, oldestDays: dOver });
        }
      }
    }
  }

  const outstanding = Math.max(0, totalBilled - totalCollected);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const topDebtors = Array.from(debtorMap.values())
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 8);

  const statusCounts = { UNPAID: 0, PARTIAL: 0, PAID: 0 } as Record<string, number>;
  for (const inv of invoices) statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;

  const recent = await prisma.invoice.findMany({
    where: { practitionerId: auth.userId },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { payers: { select: { amount: true, amountPaid: true } } },
  });

  return NextResponse.json({
    totals: {
      totalBilled,
      totalCollected,
      outstanding,
      collectionRate,
      invoiceCount: invoices.length,
      overdueLines,
    },
    statusCounts,
    ageing: AGEING_ORDER.map((b) => ({ bucket: b, amount: ageing[b] })),
    topDebtors,
    recent: recent.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      patientName: inv.patientName,
      totalAmount: inv.totalAmount,
      status: inv.status,
      serviceDate: inv.serviceDate,
      paid: inv.payers.reduce((s, p) => s + p.amountPaid, 0),
    })),
  });
}
