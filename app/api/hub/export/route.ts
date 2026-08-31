export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireHubPractitioner, prisma } from '@/lib/hub';
import {
  PAYER_TYPE_LABELS,
  PAYER_STATUS_LABELS,
  ageingBucket,
  AGEING_LABELS,
  daysOverdue,
  outstandingOf,
} from '@/lib/hub-finance';

function csvCell(v: any): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : '';

// GET — ageing / outstanding-dues report as CSV download.
export async function GET() {
  const auth = await requireHubPractitioner('hub.invoice.read');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const invoices = await prisma.invoice.findMany({
    where: { practitionerId: auth.userId, status: { in: ['UNPAID', 'PARTIAL'] } },
    include: { payers: true },
    orderBy: { serviceDate: 'desc' },
  });

  const now = new Date();
  const header = [
    'Invoice', 'Patient', 'Service Date', 'Payer', 'Payer Type',
    'Amount', 'Paid', 'Outstanding', 'Due Date', 'Days Overdue', 'Ageing', 'Status',
  ];
  const lines: string[] = [header.join(',')];

  for (const inv of invoices) {
    for (const p of inv.payers) {
      const out = outstandingOf(p);
      if (out <= 0) continue;
      lines.push(
        [
          inv.invoiceNumber,
          inv.patientName,
          fmtDate(inv.serviceDate),
          p.payerName,
          PAYER_TYPE_LABELS[p.payerType] || p.payerType,
          p.amount,
          p.amountPaid,
          out,
          fmtDate(p.dueDate),
          daysOverdue(p.dueDate, now),
          AGEING_LABELS[ageingBucket(p.dueDate, now)],
          PAYER_STATUS_LABELS[p.status] || p.status,
        ].map(csvCell).join(','),
      );
    }
  }

  const csv = lines.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pax-ageing-report-${now.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
