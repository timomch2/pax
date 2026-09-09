import path from 'path';
import { readFile } from 'fs/promises';
import { PDFDocument, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { assertPractice } from '@/lib/practice-policy';
import { formatPracticeMoney } from '@/lib/practice-money';
import { adjustedResponsibility, approvedWithholding } from '@/lib/practice-finance-math';

type DocumentLine = { text: string; heading?: boolean };
const dateText = (d: Date | null) => d ? d.toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }) : 'Date unknown — reconciliation required';
const money = formatPracticeMoney;

/** PDFs are generated in memory and returned through the same workspace authorization as the ledger. */
export async function practicePdf(title: string, lines: DocumentLine[]) {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  pdf.setTitle(title); pdf.setCreator('Praxis Exchange');
  const fontFiles = [
    path.join(process.cwd(), 'lib/assets/noto-sans-latin-400-normal.woff'),
    path.join(process.cwd(), 'lib/assets/noto-sans-latin-ext-400-normal.woff'),
    path.join(process.cwd(), 'lib/assets/noto-sans-greek-400-normal.woff'),
    path.join(process.cwd(), 'lib/assets/noto-sans-cyrillic-400-normal.woff'),
  ];
  const fonts = await Promise.all(fontFiles.map(async (path) => pdf.embedFont(await readFile(path), { subset: true })));
  const sets = fonts.map((f) => new Set(f.getCharacterSet()));
  const glyph = (c: string): { text: string; font: PDFFont } => { const i = sets.findIndex((s) => s.has(c.codePointAt(0)!)); return i >= 0 ? { text: c, font: fonts[i] } : { text: `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`, font: fonts[0] }; };
  let page = pdf.addPage([595.28, 841.89]), y = 795;
  const newPage = () => { page = pdf.addPage([595.28, 841.89]); y = 795; };
  for (const line of [{ text: title, heading: true }, ...lines]) {
    const size = line.heading ? 15 : 10;
    let x = 42;
    if (y < 55) newPage();
    const words = line.text.replace(/[\r\n\t]+/g, ' ').replace(/KSh /g, 'KSh ').match(/[^ ]+ */g) ?? [];
    for (const word of words) {
      const parts = [...word].map(glyph);
      const wordWidth = parts.reduce((sum, part) => sum + part.font.widthOfTextAtSize(part.text, size), 0);
      if (x > 42 && x + wordWidth > 550) { x = 42; y -= size + 6; if (y < 55) newPage(); }
      for (const part of parts) {
        const width = part.font.widthOfTextAtSize(part.text, size);
        if (x + width > 550) { x = 42; y -= size + 6; if (y < 55) newPage(); }
        page.drawText(part.text, { x, y, size, font: part.font }); x += width;
      }
    }
    y -= size + (line.heading ? 14 : 8);
  }
  pdf.getPages().forEach((p, index) => p.drawText(`Praxis Exchange | ${index + 1} / ${pdf.getPageCount()}`, { x: 42, y: 28, size: 8, font: fonts[0] }));
  return pdf.save();
}

export async function practiceFinancialDocument(actorId: string, workspaceId: string, kind: 'invoice' | 'receipt', id: string) {
  const auth = await authorizePracticeUser(actorId, workspaceId, 'billing.read');
  const lines: DocumentLine[] = [{ text: `Practitioner: ${auth.ownerName}` }];
  let title: string;
  if (kind === 'invoice') {
    const invoice = await prisma.practiceInvoice.findFirst({ where: { id, workspaceId }, include: { lines: true, payers: { include: { adjustments: true, allocations: { where: { reversedAt: null, receipt: { reversedAt: null } } } } }, adjustments: { where: { status: 'APPROVED' } } } });
    assertPractice(invoice, 404, 'Invoice not found');
    title = `Invoice ${invoice.number}`;
    lines.push({ text: `Issued: ${dateText(invoice.issuedAt)} | ${invoice.status}` }, { text: 'Original issued service lines', heading: true });
    for (const row of invoice.lines) lines.push({ text: `${dateText(row.serviceDate)} | ${row.description} | ${row.patientName ?? row.patientReference ?? 'Facility consulting'} | ${money(row.amountMinor)}` });
    const facilities = Array.isArray(invoice.facilitySnapshot) ? invoice.facilitySnapshot : [];
    for (const item of facilities) { const f = item as Record<string, unknown>; lines.push({ text: `Facility at issue: ${[f.name ?? f.officialName, f.town, f.county, f.country ?? f.countryCode].filter(Boolean).join(', ')}` }); }
    lines.push({ text: `Pre-tax: ${money(invoice.netMinor)} | Tax: ${money(invoice.taxMinor)} | Original total: ${money(invoice.totalMinor)}` });
    const snapshot = invoice.taxSnapshot as any;
    for (const [label, rate] of Object.entries(snapshot)) if (rate && typeof rate === 'object') { const r = rate as any; if (r.rateBps !== undefined) lines.push({ text: `${label}: ${r.name ?? ''} ${r.rateBps / 100}% | ${r.inclusive ? 'Inclusive' : 'Exclusive'} | Base: ${r.base}` }); }
    lines.push({ text: `Expected withholding: ${money(invoice.expectedWithholdingMinor)}. Evidence and practitioner approval are required before it settles a balance.` }, { text: 'Payer responsibilities and current balances', heading: true });
    for (const payer of invoice.payers) {
      const responsibility = invoice.status === 'VOID' ? 0 : adjustedResponsibility(payer.amountMinor, payer.adjustments), cash = payer.allocations.reduce((n, a) => n + a.amountMinor, 0), withholding = approvedWithholding(payer.adjustments);
      lines.push({ text: `${(payer.payerSnapshot as any)?.name ?? 'Payer'} | Original ${money(payer.amountMinor)} | Due ${dateText(payer.dueAt)} | Applied cash ${money(cash)} | Approved withholding ${money(withholding)} | Current balance ${money(Math.max(0, responsibility - cash - withholding))}` });
    }
    if (invoice.adjustments.length) lines.push({ text: 'Approved adjustments — original invoice preserved', heading: true });
    for (const a of invoice.adjustments) lines.push({ text: `${dateText(a.reviewedAt)} | ${a.kind} | ${money(a.amountMinor)} | ${a.reason}${a.evidenceReference ? ` | Reference ${a.evidenceReference}` : ''}` });
  } else {
    const receipt = await prisma.practiceReceipt.findFirst({ where: { id, workspaceId }, include: { payer: true, allocations: { include: { invoicePayer: { include: { invoice: true } } } }, adjustments: { where: { status: 'APPROVED' } } } });
    assertPractice(receipt, 404, 'Receipt not found'); title = `Receipt ${receipt.id}`;
    const paid = receipt.allocations.filter((a) => !a.reversedAt).reduce((n, a) => n + a.amountMinor, 0), refunded = receipt.adjustments.filter((a) => a.kind === 'REFUND').reduce((n, a) => n + a.amountMinor, 0);
    lines.push({ text: `Payer: ${receipt.payer.name}` }, { text: `Received: ${dateText(receipt.receivedAt)} | ${money(receipt.amountMinor)} | ${receipt.method}` }, { text: `Reference: ${receipt.reference ?? 'Not provided'} | Recorded by account: ${receipt.recordedById}` }, { text: receipt.reversedAt ? `REVERSED on ${dateText(receipt.reversedAt)}` : `Unapplied credit: ${money(receipt.amountMinor - paid - refunded)}` }, { text: 'Allocation history', heading: true });
    for (const a of receipt.allocations) lines.push({ text: `${a.invoicePayer.invoice.number} | ${money(a.amountMinor)} | ${a.reversedAt ? `Reversed ${dateText(a.reversedAt)}` : 'Applied'}` });
    for (const a of receipt.adjustments) lines.push({ text: `${a.kind} | ${money(a.amountMinor)} | ${dateText(a.occurredAt ?? a.reviewedAt)} | ${a.reason}` });
  }
  lines.push({ text: 'Records payments made externally. Praxis Exchange does not collect or transfer these funds.' });
  await authorizePracticeUser(actorId, workspaceId, 'billing.read');
  return practicePdf(title, lines);
}
