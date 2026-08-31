import { createHmac, timingSafeEqual } from 'node:crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export type PaystackTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  customer?: { email?: string | null; customer_code?: string | null };
  metadata?: Record<string, unknown> | null;
};

export type PaystackRefund = {
  id: number;
  status: string;
  amount: number;
  currency: string;
  refunded_at?: string | null;
  transaction?: number | { id?: number; reference?: string };
};

function secretKey(): string {
  const value = process.env.PAYSTACK_SECRET_KEY;
  if (!value) throw new Error('PAYSTACK_NOT_CONFIGURED');
  return value;
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.status) {
    throw new Error(body?.message || `PAYSTACK_HTTP_${response.status}`);
  }
  return body.data as T;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amountMinor: number;
  currency: string;
  callbackUrl: string;
  reference: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  return paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency,
      callback_url: input.callbackUrl,
      reference: input.reference,
      metadata: input.metadata,
    }),
  });
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction> {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export async function createPaystackRefund(input: {
  transaction: string;
  amountMinor: number;
  currency: string;
  customerNote?: string;
  merchantNote: string;
}): Promise<PaystackRefund> {
  return paystackRequest('/refund', {
    method: 'POST',
    body: JSON.stringify({
      transaction: input.transaction,
      amount: input.amountMinor,
      currency: input.currency,
      customer_note: input.customerNote,
      merchant_note: input.merchantNote,
    }),
  });
}

export function verifyPaystackWebhook(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const provided = signature.trim().toLowerCase();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
