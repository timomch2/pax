import { createHmac, timingSafeEqual } from 'node:crypto';

type MpesaEnvironment = 'sandbox' | 'production';

function environment(): MpesaEnvironment {
  return process.env.MPESA_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
}

function baseUrl(): string {
  return environment() === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('MPESA_NOT_CONFIGURED');
  return value;
}

async function accessToken(): Promise<string> {
  const credentials = Buffer.from(`${required('MPESA_CONSUMER_KEY')}:${required('MPESA_CONSUMER_SECRET')}`).toString('base64');
  const response = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.access_token) throw new Error(body?.errorMessage || 'MPESA_AUTH_FAILED');
  return body.access_token;
}

function timestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}${value.hour}${value.minute}${value.second}`;
}

function password(shortcode: string, value: string): string {
  return Buffer.from(`${shortcode}${required('MPESA_PASSKEY')}${value}`).toString('base64');
}

export function normalizeKenyanPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

export function mpesaCallbackSignature(purpose = 'stk'): string {
  return createHmac('sha256', required('MPESA_CALLBACK_SECRET')).update(`pax-mpesa-${purpose}-callback`).digest('hex');
}

export function verifyMpesaCallbackSignature(value: string, purpose = 'stk'): boolean {
  let expected: string;
  try { expected = mpesaCallbackSignature(purpose); } catch { return false; }
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export async function registerMpesaC2bUrls(origin: string): Promise<Record<string, unknown>> {
  const token = await accessToken();
  const signature = mpesaCallbackSignature('c2b');
  const response = await fetch(`${baseUrl()}/mpesa/c2b/v1/registerurl`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ShortCode: required('MPESA_SHORTCODE'),
      ResponseType: 'Completed',
      ConfirmationURL: `${origin}/api/payments/mpesa/c2b/${signature}/confirmation`,
      ValidationURL: `${origin}/api/payments/mpesa/c2b/${signature}/validation`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || (body?.ResponseCode && body.ResponseCode !== '0')) throw new Error(body?.errorMessage || body?.ResponseDescription || 'MPESA_C2B_REGISTRATION_FAILED');
  return body;
}

export async function createMpesaStkPush(input: {
  phone: string;
  amountKes: number;
  accountReference: string;
  description: string;
  callbackUrl: string;
}): Promise<{ MerchantRequestID: string; CheckoutRequestID: string; ResponseCode: string; ResponseDescription: string; CustomerMessage: string }> {
  const shortcode = required('MPESA_SHORTCODE');
  const value = timestamp();
  const token = await accessToken();
  const response = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password(shortcode, value),
      Timestamp: value,
      TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
      Amount: input.amountKes,
      PartyA: input.phone,
      PartyB: shortcode,
      PhoneNumber: input.phone,
      CallBackURL: input.callbackUrl,
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: input.description.slice(0, 20),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ResponseCode !== '0' || !body?.CheckoutRequestID) {
    throw new Error(body?.errorMessage || body?.ResponseDescription || 'MPESA_STK_PUSH_FAILED');
  }
  return body;
}

export async function queryMpesaStk(checkoutRequestId: string): Promise<Record<string, unknown>> {
  const shortcode = required('MPESA_SHORTCODE');
  const value = timestamp();
  const token = await accessToken();
  const response = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password(shortcode, value),
      Timestamp: value,
      CheckoutRequestID: checkoutRequestId,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.errorMessage || 'MPESA_QUERY_FAILED');
  return body;
}
