import { z } from 'zod';
import { requirePractice } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { practiceResponse } from '@/lib/practice-http';
import { assertPractice } from '@/lib/practice-policy';
import { savePracticePayer, savePracticeTaxRate, issuePracticeInvoice, recordPracticeReceipt, allocatePracticeCredit, proposePracticeAdjustment, reviewPracticeAdjustment, generatePracticeRetainers, payerBalance, receiptBalance } from '@/lib/practice-finance';
import { adjustedResponsibility, approvedWithholding } from '@/lib/practice-finance-math';
export const dynamic = 'force-dynamic';
type Context = { params: { workspaceId: string } };

export async function GET(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'billing.read');
    const query = z.object({ view: z.enum(['services', 'invoices', 'receipts', 'payers', 'rates', 'adjustments']).default('services'), cursor: z.string().cuid().optional(), payerId: z.string().cuid().optional() }).parse(Object.fromEntries(new URL(request.url).searchParams));
    const page = { orderBy: { id: 'asc' as const }, take: 51, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}) };
    const where = { workspaceId: auth.workspaceId };
    let rows: { id: string }[];
    switch (query.view) {
      case 'services': rows = await prisma.practiceService.findMany({ where: { ...where, invoiceLine: null, coveredByRetainer: false }, select: { id: true, description: true, serviceCode: true, serviceDate: true, amountMinor: true, facilityId: true, patientId: true, patient: { select: { id: true, name: true, patientRef: true, patientCode: true } }, facility: { select: { id: true, officialName: true } } }, ...page }); break;
      case 'payers': rows = await prisma.practicePayer.findMany({ where, ...page }); break;
      case 'rates': rows = await prisma.practiceTaxRate.findMany({ where, ...page }); break;
      case 'adjustments': rows = await prisma.practiceAdjustment.findMany({ where: { ...where, status: 'PENDING' }, include: { invoice: { select: { number: true } }, receipt: { select: { reference: true } } }, ...page }); break;
      case 'invoices': {
        const invoices = await prisma.practiceInvoice.findMany({ where: { ...where, ...(query.payerId ? { payers: { some: { payerId: query.payerId } } } : {}) }, include: { lines: true, payers: { include: { payer: { select: { name: true } }, adjustments: true, allocations: { where: { reversedAt: null, receipt: { reversedAt: null } } } } } }, ...page });
        rows = invoices.map((invoice) => ({ ...invoice, payers: invoice.payers.map(({ adjustments, allocations, ...payer }) => {
          const responsibilityMinor = invoice.status === 'VOID' ? 0 : adjustedResponsibility(payer.amountMinor, adjustments);
          const cashMinor = allocations.reduce((sum, row) => sum + row.amountMinor, 0), withholdingMinor = approvedWithholding(adjustments);
          return { ...payer, responsibilityMinor, cashMinor, withholdingMinor, outstandingMinor: Math.max(0, responsibilityMinor - cashMinor - withholdingMinor) };
        }) })); break;
      }
      case 'receipts': {
        const receipts = await prisma.practiceReceipt.findMany({ where: { ...where, ...(query.payerId ? { payerId: query.payerId } : {}) }, include: { payer: { select: { name: true } }, allocations: { where: { reversedAt: null } }, adjustments: { where: { kind: 'REFUND', status: 'APPROVED' } } }, ...page });
        rows = receipts.map(({ allocations, adjustments, ...receipt }) => {
          const allocatedMinor = allocations.reduce((sum, row) => sum + row.amountMinor, 0), refundedMinor = adjustments.reduce((sum, row) => sum + row.amountMinor, 0);
          return { ...receipt, allocatedMinor, refundedMinor, availableMinor: receipt.reversedAt ? 0 : receipt.amountMinor - allocatedMinor - refundedMinor };
        }); break;
      }
    }
    return { rows: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].id : null };
  });
}

export async function POST(request: Request, { params }: Context) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, 'billing.manage');
    const { action, data } = z.object({ action: z.enum(['payer', 'rate', 'invoice', 'receipt', 'allocate', 'adjustment', 'review', 'retainers']), data: z.unknown() }).strict().parse(await request.json());
    const handlers = { payer: savePracticePayer, rate: savePracticeTaxRate, invoice: issuePracticeInvoice, receipt: recordPracticeReceipt, allocate: allocatePracticeCredit, adjustment: proposePracticeAdjustment, review: reviewPracticeAdjustment, retainers: generatePracticeRetainers };
    assertPractice(action !== 'review' || auth.capabilities.includes('billing.approve'), 403, 'Only the practitioner can approve adjustments');
    return { result: await handlers[action](auth.actorId, auth.workspaceId, data) };
  });
}
