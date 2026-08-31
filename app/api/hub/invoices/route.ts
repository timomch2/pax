export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner, prisma } from '@/lib/hub';
import { logAudit } from '@/lib/audit';
import {
  computeInvoiceStatus,
  computePayerStatus,
} from '@/lib/hub-finance';
import { z } from 'zod';

function invoiceNumber(userId: string, sequence: number, year: number): string {
  const short = userId.slice(-4).toUpperCase();
  return `INV-${year}-${short}-${String(sequence).padStart(6, '0')}`;
}

const payerSchema = z.object({
  payerType: z.enum(['PATIENT', 'INSURER', 'EMPLOYER', 'SHA_NHIF', 'NGO_DONOR', 'OTHER']),
  payerName: z.string().trim().min(1).max(160),
  insurerId: z.string().cuid().nullable().optional(),
  amount: z.number().finite().nonnegative(),
  amountPaid: z.number().finite().nonnegative().default(0),
  method: z.enum(['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'CHEQUE', 'OTHER']).nullable().optional(),
  dueDate: z.string().max(40).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  contactEmail: z.string().email().max(320).nullable().optional(),
}).strict();

const invoiceSchema = z.object({
  hubPatientId: z.string().cuid().nullable().optional(),
  patientName: z.string().trim().max(160).optional(),
  serviceDesc: z.string().trim().min(1).max(2_000),
  serviceType: z.string().trim().max(160).nullable().optional(),
  serviceDate: z.string().max(40).nullable().optional(),
  notes: z.string().trim().max(5_000).nullable().optional(),
  payers: z.array(payerSchema).min(1).max(20),
}).strict();

// GET — list invoices with filters + a summary strip.
export async function GET(req: NextRequest) {
  const auth = await requireHubPractitioner('hub.invoice.read');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const q = sp.get('q')?.trim();
  const patientId = sp.get('patientId');
  const outstandingOnly = sp.get('outstanding') === 'true';

  const where: any = { practitionerId: auth.userId };
  if (status && status !== 'ALL') where.status = status;
  if (patientId) where.hubPatientId = patientId;
  if (q) {
    where.OR = [
      { patientName: { contains: q, mode: 'insensitive' } },
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { serviceDesc: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (outstandingOnly) where.status = { in: ['UNPAID', 'PARTIAL'] };

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { serviceDate: 'desc' },
    include: { payers: true, hubPatient: { select: { id: true, name: true, phone: true } } },
    take: 200,
  });

  return NextResponse.json({ invoices });
}

// POST — create a split-payer invoice.
export async function POST(req: NextRequest) {
  const auth = await requireHubPractitioner('hub.invoice.create');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = invoiceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid invoice', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const body = parsed.data;
  const payersIn = body.payers;
  const serviceDesc = body.serviceDesc;

  // Resolve patient name (linked record takes precedence).
  let patientName = body.patientName ?? '';
  let hubPatientId: string | null = body.hubPatientId || null;
  if (hubPatientId) {
    const p = await prisma.hubPatient.findFirst({ where: { id: hubPatientId, practitionerId: auth.userId } });
    if (!p) return NextResponse.json({ error: 'Patient record not found.' }, { status: 400 });
    patientName = p.name;
  }
  if (!patientName) return NextResponse.json({ error: 'Patient name is required.' }, { status: 400 });

  const now = new Date();
  const cleanPayers = payersIn.map((p) => {
    const amount = Math.round(p.amount);
    const amountPaid = Math.round(p.amountPaid);
    const dueDate = p.dueDate ? new Date(p.dueDate) : null;
    return {
      payerType: p.payerType,
      payerName: p.payerName,
      insurerId: p.insurerId || null,
      amount,
      amountPaid: Math.min(amountPaid, amount),
      method: p.method || null,
      status: computePayerStatus(amount, amountPaid, dueDate, now),
      dueDate,
      paidAt: amountPaid >= amount && amount > 0 ? now : null,
      contactPhone: p.contactPhone?.trim() || null,
      contactEmail: p.contactEmail?.trim() || null,
    };
  });

  const total = cleanPayers.reduce((s: number, p: any) => s + p.amount, 0);
  if (total <= 0) return NextResponse.json({ error: 'Total amount must be greater than zero.' }, { status: 400 });

  const status = computeInvoiceStatus(cleanPayers);
  const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Africa/Nairobi', year: 'numeric' }).format(now));
  const invoice = await prisma.$transaction(async (tx) => {
    const sequence = await tx.invoiceSequence.upsert({
      where: { practitionerId_year: { practitionerId: auth.userId, year } },
      create: { practitionerId: auth.userId, year, nextValue: 2 },
      update: { nextValue: { increment: 1 } },
    });
    return tx.invoice.create({
      data: {
        practitionerId: auth.userId,
        hubPatientId,
        invoiceNumber: invoiceNumber(auth.userId, sequence.nextValue - 1, year),
        patientName,
        serviceDesc,
        serviceType: body.serviceType || null,
        serviceDate: body.serviceDate ? new Date(body.serviceDate) : now,
        totalAmount: total,
        status,
        notes: body.notes || null,
        payers: { create: cleanPayers },
      },
      include: { payers: true },
    });
  }, { isolationLevel: 'Serializable' });

  await logAudit({ userId: auth.userId, action: 'INVOICE_CREATE', entityType: 'Invoice', entityId: invoice.id, request: req });
  return NextResponse.json({ invoice });
}
