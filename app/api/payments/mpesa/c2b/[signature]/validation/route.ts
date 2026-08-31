export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyMpesaCallbackSignature } from '@/lib/mpesa';

const c2bSchema = z.object({
  TransID: z.string().min(5).max(40),
  TransAmount: z.union([z.string(), z.number()]),
  BusinessShortCode: z.union([z.string(), z.number()]),
  BillRefNumber: z.string().min(3).max(100),
  MSISDN: z.union([z.string(), z.number()]),
}).passthrough();

export async function POST(request: Request, { params }: { params: { signature: string } }) {
  if (!verifyMpesaCallbackSignature(params.signature, 'c2b')) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 404 });
  const parsed = c2bSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid request' });
  const amountMinor = Math.round(Number(parsed.data.TransAmount) * 100);
  const intent = await prisma.paymentIntent.findUnique({ where: { provider_providerReference: { provider: 'MPESA', providerReference: parsed.data.BillRefNumber } } });
  const correctShortcode = String(parsed.data.BusinessShortCode) === process.env.MPESA_SHORTCODE;
  const acceptable = Boolean(intent && ['PENDING', 'REQUIRES_ACTION', 'PROCESSING'].includes(intent.status) && intent.currency === 'KES' && intent.amountMinor === amountMinor && correctShortcode);
  return NextResponse.json({ ResultCode: acceptable ? 0 : 1, ResultDesc: acceptable ? 'Accepted' : 'Invalid account or amount' });
}
