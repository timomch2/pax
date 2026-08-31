// Practitioners Hub — finance-first shared helpers (client-safe: no server imports).

export const HUB_CURRENCY = 'KSh';

export function formatKsh(amount: number): string {
  return `${HUB_CURRENCY} ${Math.round(amount || 0).toLocaleString('en-KE')}`;
}

// ── Payer types ──
export const PAYER_TYPE_LABELS: Record<string, string> = {
  PATIENT: 'Patient (self-pay)',
  INSURER: 'Private insurer',
  EMPLOYER: 'Employer / corporate',
  SHA_NHIF: 'SHA / NHIF',
  NGO_DONOR: 'NGO / donor',
  OTHER: 'Other',
};
export const PAYER_TYPES = Object.keys(PAYER_TYPE_LABELS);

// ── Payment methods ──
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  INSURANCE: 'Insurance settlement',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};
export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS);

// ── Payer line status ──
export const PAYER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
};
export const PAYER_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  PAID: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  OVERDUE: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

// ── Invoice status ──
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  UNPAID: 'Unpaid',
  PARTIAL: 'Partly paid',
  PAID: 'Paid',
};
export const INVOICE_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
  UNPAID: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  PARTIAL: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  PAID: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
};

// ── Insurer categories ──
export const INSURER_CATEGORY_LABELS: Record<string, string> = {
  PUBLIC: 'Public scheme',
  PRIVATE: 'Private insurer',
  CORPORATE: 'Corporate / employer',
  NGO_DONOR: 'NGO / donor',
  OTHER: 'Other',
};
export const INSURER_CATEGORIES = Object.keys(INSURER_CATEGORY_LABELS);

// ── Reminder channels ──
export const REMINDER_CHANNEL_LABELS: Record<string, string> = {
  IN_APP: 'In-app log',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
};

// System-default insurer / payer directory for Kenya.
export const SYSTEM_INSURERS: { name: string; shortName: string; category: string }[] = [
  { name: 'Social Health Authority', shortName: 'SHA', category: 'PUBLIC' },
  { name: 'National Hospital Insurance Fund (legacy)', shortName: 'NHIF', category: 'PUBLIC' },
  { name: 'AAR Insurance', shortName: 'AAR', category: 'PRIVATE' },
  { name: 'Jubilee Health Insurance', shortName: 'Jubilee', category: 'PRIVATE' },
  { name: 'Madison Insurance', shortName: 'Madison', category: 'PRIVATE' },
  { name: 'Britam', shortName: 'Britam', category: 'PRIVATE' },
  { name: 'CIC Insurance', shortName: 'CIC', category: 'PRIVATE' },
  { name: 'APA Insurance', shortName: 'APA', category: 'PRIVATE' },
  { name: 'Old Mutual / UAP', shortName: 'UAP', category: 'PRIVATE' },
  { name: 'Minet Kenya', shortName: 'Minet', category: 'PRIVATE' },
];

// ── Ageing buckets (days since due) ──
export type AgeingBucket = 'CURRENT' | 'D1_30' | 'D31_60' | 'D61_90' | 'D90_PLUS';

export const AGEING_LABELS: Record<AgeingBucket, string> = {
  CURRENT: 'Not yet due',
  D1_30: '1–30 days',
  D31_60: '31–60 days',
  D61_90: '61–90 days',
  D90_PLUS: '90+ days',
};
export const AGEING_ORDER: AgeingBucket[] = ['CURRENT', 'D1_30', 'D31_60', 'D61_90', 'D90_PLUS'];

// Days a line is overdue (>=0). Returns 0 if not yet due or no due date.
export function daysOverdue(dueDate: Date | string | null | undefined, now: Date = new Date()): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const ms = now.getTime() - due.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function ageingBucket(dueDate: Date | string | null | undefined, now: Date = new Date()): AgeingBucket {
  const d = daysOverdue(dueDate, now);
  if (d <= 0) return 'CURRENT';
  if (d <= 30) return 'D1_30';
  if (d <= 60) return 'D31_60';
  if (d <= 90) return 'D61_90';
  return 'D90_PLUS';
}

// Compute the invoice status from its payer lines.
export function computeInvoiceStatus(
  payers: { amount: number; amountPaid: number }[],
): 'UNPAID' | 'PARTIAL' | 'PAID' {
  const total = payers.reduce((s, p) => s + (p.amount || 0), 0);
  const paid = payers.reduce((s, p) => s + (p.amountPaid || 0), 0);
  if (paid <= 0) return 'UNPAID';
  if (paid >= total && total > 0) return 'PAID';
  return 'PARTIAL';
}

// Line-level status derived from paid amount + due date.
export function computePayerStatus(
  amount: number,
  amountPaid: number,
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): 'PENDING' | 'PAID' | 'OVERDUE' {
  if (amountPaid >= amount && amount > 0) return 'PAID';
  if (daysOverdue(dueDate, now) > 0) return 'OVERDUE';
  return 'PENDING';
}

export function outstandingOf(p: { amount: number; amountPaid: number }): number {
  return Math.max(0, (p.amount || 0) - (p.amountPaid || 0));
}

// Build a courteous reminder message for a debtor.
export function buildReminderMessage(input: {
  payerName: string;
  patientName: string;
  practitionerName: string;
  invoiceNumber: string;
  outstanding: number;
  daysOverdue: number;
  serviceDesc?: string;
}): string {
  const { payerName, patientName, practitionerName, invoiceNumber, outstanding, daysOverdue, serviceDesc } = input;
  const overdueLine =
    daysOverdue > 0
      ? `This balance is now ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.`
      : `This balance is currently outstanding.`;
  return (
    `Dear ${payerName},\n\n` +
    `This is a friendly reminder regarding invoice ${invoiceNumber}` +
    `${serviceDesc ? ` for ${serviceDesc}` : ''} in respect of ${patientName}. ` +
    `An amount of ${formatKsh(outstanding)} remains outstanding. ${overdueLine}\n\n` +
    `Kindly arrange settlement at your earliest convenience. Thank you.\n\n` +
    `${practitionerName}`
  );
}

// Digits-only phone for wa.me / sms: links (strip +, spaces, dashes).
export function phoneDigits(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}
