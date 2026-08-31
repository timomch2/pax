export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma } from '@/lib/hub';
import {
  formatKsh,
  PAYER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYER_STATUS_LABELS,
  outstandingOf,
} from '@/lib/hub-finance';

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' }).format(new Date(d)) : '—';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireHubPractitioner('hub.invoice.read');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { mode } = await req.json().catch(() => ({ mode: 'invoice' }));
  const isReceipt = mode === 'receipt';

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, practitionerId: auth.userId },
    include: { payers: { orderBy: { createdAt: 'asc' }, include: { insurer: true } }, hubPatient: true },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const practitioner = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true, phone: true, email: true, organization: true, paxId: true, city: true, country: true },
  });

  const totalPaid = invoice.payers.reduce((s, p) => s + p.amountPaid, 0);
  const totalOutstanding = invoice.payers.reduce((s, p) => s + outstandingOf(p), 0);

  const rows = invoice.payers
    .map(
      (p) => `<tr>
      <td>${esc(p.payerName)}${p.insurer ? ` <span class="muted">(${esc(p.insurer.shortName || p.insurer.name)})</span>` : ''}<div class="muted small">${esc(PAYER_TYPE_LABELS[p.payerType] || p.payerType)}</div></td>
      <td>${p.method ? esc(PAYMENT_METHOD_LABELS[p.method] || p.method) : '—'}</td>
      <td class="num">${formatKsh(p.amount)}</td>
      <td class="num">${formatKsh(p.amountPaid)}</td>
      <td class="num">${formatKsh(outstandingOf(p))}</td>
      <td><span class="status s-${p.status}">${esc(PAYER_STATUS_LABELS[p.status] || p.status)}</span></td>
    </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#0B0F1A; color:#E0E6EF; -webkit-print-color-adjust:exact; print-color-adjust:exact; font-size:11pt; padding:0; }
  .wrap { padding:28px 34px; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #2ABFB0; padding-bottom:16px; }
  .brand { font-size:20pt; font-weight:800; color:#fff; letter-spacing:.5px; }
  .brand span { color:#2ABFB0; }
  .brand .sub { font-size:9pt; font-weight:400; color:#8A94A6; letter-spacing:2px; margin-top:2px; }
  .doc { text-align:right; }
  .doc h1 { font-size:16pt; color:#FBBF24; letter-spacing:1px; }
  .doc .no { color:#8A94A6; font-size:10pt; margin-top:4px; }
  .meta { display:flex; justify-content:space-between; margin-top:22px; gap:24px; }
  .box { background:#131929; border:1px solid #1E2637; border-radius:8px; padding:14px 16px; flex:1; }
  .box h3 { font-size:8pt; text-transform:uppercase; letter-spacing:1.5px; color:#8A94A6; margin-bottom:8px; }
  .box .l { font-size:11pt; color:#fff; font-weight:600; }
  .box .m { font-size:9.5pt; color:#A8B2C4; margin-top:3px; }
  table { width:100%; border-collapse:collapse; margin-top:22px; }
  th { text-align:left; font-size:8pt; text-transform:uppercase; letter-spacing:1px; color:#8A94A6; padding:9px 8px; border-bottom:1px solid #2A3346; }
  td { padding:11px 8px; border-bottom:1px solid #1A2130; font-size:10pt; vertical-align:top; }
  td.num, th.num { text-align:right; white-space:nowrap; }
  .muted { color:#8A94A6; } .small { font-size:8pt; margin-top:2px; }
  .status { font-size:8pt; padding:2px 8px; border-radius:20px; font-weight:600; }
  .s-PAID { background:rgba(16,185,129,.15); color:#34d399; }
  .s-PENDING { background:rgba(245,158,11,.15); color:#fbbf24; }
  .s-OVERDUE { background:rgba(220,38,38,.15); color:#f87171; }
  .totals { margin-top:18px; margin-left:auto; width:280px; }
  .totals .row { display:flex; justify-content:space-between; padding:7px 4px; font-size:10.5pt; }
  .totals .row.grand { border-top:2px solid #2A3346; margin-top:6px; padding-top:12px; font-size:13pt; font-weight:800; color:#fff; }
  .totals .out { color:#f87171; font-weight:700; }
  .totals .paid { color:#34d399; }
  .note { margin-top:24px; background:#131929; border-left:3px solid #FBBF24; padding:12px 16px; font-size:9.5pt; color:#A8B2C4; border-radius:0 6px 6px 0; }
  .foot { margin-top:30px; text-align:center; color:#6B7484; font-size:8.5pt; border-top:1px solid #1A2130; padding-top:14px; }
</style></head><body><div class="wrap">
  <div class="top">
    <div class="brand">PAX<span>•</span>Exchange<div class="sub">PRACTITIONERS HUB</div></div>
    <div class="doc"><h1>${isReceipt ? 'RECEIPT' : 'INVOICE'}</h1><div class="no">${esc(invoice.invoiceNumber)}</div><div class="no">${fmtDate(invoice.serviceDate)}</div></div>
  </div>
  <div class="meta">
    <div class="box"><h3>From</h3><div class="l">${esc(practitioner?.name || '')}</div>${practitioner?.organization ? `<div class="m">${esc(practitioner.organization)}</div>` : ''}${practitioner?.phone ? `<div class="m">${esc(practitioner.phone)}</div>` : ''}${practitioner?.email ? `<div class="m">${esc(practitioner.email)}</div>` : ''}${practitioner?.paxId ? `<div class="m">${esc(practitioner.paxId)}</div>` : ''}</div>
    <div class="box"><h3>Patient</h3><div class="l">${esc(invoice.patientName)}</div>${invoice.hubPatient?.phone ? `<div class="m">${esc(invoice.hubPatient.phone)}</div>` : ''}${invoice.hubPatient?.patientRef ? `<div class="m">Ref: ${esc(invoice.hubPatient.patientRef)}</div>` : ''}</div>
    <div class="box"><h3>Service</h3><div class="l">${esc(invoice.serviceType || 'Consultation')}</div><div class="m">${esc(invoice.serviceDesc)}</div></div>
  </div>
  <table><thead><tr><th>Payer</th><th>Method</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals">
    <div class="row"><span>Total billed</span><span>${formatKsh(invoice.totalAmount)}</span></div>
    <div class="row"><span>Total paid</span><span class="paid">${formatKsh(totalPaid)}</span></div>
    <div class="row grand"><span>${totalOutstanding > 0 ? 'Balance due' : 'Settled'}</span><span class="${totalOutstanding > 0 ? 'out' : 'paid'}">${formatKsh(totalOutstanding)}</span></div>
  </div>
  ${invoice.notes ? `<div class="note">${esc(invoice.notes)}</div>` : ''}
  <div class="foot">Generated via PAX Exchange • Praxis Exchange Practitioners Hub • ${fmtDate(new Date())}<br/>This document is issued directly by the practitioner. PAX Exchange processes no payments and is not a party to this transaction.</div>
</div></body></html>`;

  const apiKey = process.env.ABACUSAI_API_KEY;
  const pdfResp = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deployment_token: apiKey,
      html_content: html,
      pdf_options: { format: 'A4', print_background: true, margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } },
    }),
  });
  const pdfData = await pdfResp.json();
  const requestId = pdfData?.request_id || pdfData?.result?.request_id;
  if (!requestId) return NextResponse.json({ error: 'PDF generation failed to start' }, { status: 502 });
  return NextResponse.json({ requestId });
}
