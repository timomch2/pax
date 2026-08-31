export const dynamic = 'force-dynamic';

import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const schema = z.object({
  assetId: z.string().uuid(),
  status: z.enum(['CLEAN', 'REJECTED']),
  provider: z.string().trim().min(1).max(120),
  reference: z.string().trim().max(500).optional().nullable(),
  result: z.string().trim().max(5000).optional().nullable(),
}).strict();

export async function POST(request: Request) {
  const secret = process.env.UPLOAD_SCAN_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const timestamp = request.headers.get('x-pax-scan-timestamp') || '';
  const signature = request.headers.get('x-pax-scan-signature') || '';
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rawBody = await request.text();
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const supplied = Buffer.from(signature);
  const valid = supplied.length === expected.length && timingSafeEqual(supplied, Buffer.from(expected));
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid scan result' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid scan result' }, { status: 400 });

  const updated = await prisma.uploadAsset.updateMany({
    where: { id: parsed.data.assetId, status: { in: ['QUARANTINED', 'SCANNING'] } },
    data: {
      status: parsed.data.status,
      scanProvider: parsed.data.provider,
      scanReference: parsed.data.reference ?? null,
      scanResult: parsed.data.result ?? null,
      scannedAt: new Date(),
    },
  });
  if (updated.count !== 1) return NextResponse.json({ error: 'Not found or already finalized' }, { status: 404 });
  await prisma.uploadAssetAccessLog.create({ data: { assetId: parsed.data.assetId, action: 'MALWARE_SCAN_RESULT', outcome: parsed.data.status === 'CLEAN' ? 'SUCCESS' : 'DENIED' } });
  return NextResponse.json({ ok: true });
}
