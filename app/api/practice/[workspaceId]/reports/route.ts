import { NextResponse } from 'next/server';
import { requirePractice } from '@/lib/authorization';
import { practiceResponse } from '@/lib/practice-http';
import { practiceReport, reportCsv } from '@/lib/practice-reports';
import { practicePdf } from '@/lib/practice-documents';
import { formatPracticeMoney } from '@/lib/practice-money';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: { workspaceId: string } }) {
  let download: NextResponse | null = null;
  const result = await practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'report.read');
    const report = await practiceReport(auth.actorId, auth.workspaceId, Object.fromEntries(new URL(request.url).searchParams));
    if (report.filters.format === 'csv') download = new NextResponse(reportCsv(report), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="practice-report.csv"', 'Cache-Control': 'no-store' } });
    if (report.filters.format === 'pdf') {
      const pdf = await practicePdf('Practice financial report', [{ text: report.ownerName }, { text: `${report.filters.from} to ${report.filters.to}` }, { text: report.balanceBasis }, ...Object.entries(report.totals).map(([key, value]) => ({ text: `${key.replace(/Minor$/, '').replace(/([A-Z])/g, ' $1')}: ${formatPracticeMoney(value)}` })), { text: 'Account statement', heading: true }, { text: report.statement.basis }, { text: `Opening dated balance: ${formatPracticeMoney(report.statement.openingMinor)} | Closing dated balance: ${formatPracticeMoney(report.statement.closingDatedMinor)} | Undated settlements: ${formatPracticeMoney(report.statement.undatedSettlementMinor)}` }, ...report.statement.rows.map((r) => ({ text: `${r.date.slice(0, 10)} | ${r.type} | ${r.reference} | ${formatPracticeMoney(r.amountMinor)} | Balance ${formatPracticeMoney(r.balanceMinor)}` })), { text: 'Dated activity', heading: true }, ...report.rows.map((r) => ({ text: `${r.date.slice(0, 10)} | ${r.type} | ${r.reference} | ${r.description} | ${formatPracticeMoney(r.amountMinor)} ${r.method}` }))]);
      download = new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="practice-report.pdf"', 'Cache-Control': 'no-store' } });
    }
    return report;
  });
  return download ?? result;
}
