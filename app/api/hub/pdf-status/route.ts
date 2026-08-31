export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireHubPractitioner } from '@/lib/hub';

// POST — poll PDF generation status.
export async function POST(req: NextRequest) {
  const auth = await requireHubPractitioner('hub.invoice.read');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { requestId } = await req.json().catch(() => ({}));
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
  const apiKey = process.env.ABACUSAI_API_KEY;
  const resp = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_id: requestId, deployment_token: apiKey }),
  });
  const statusResult = await resp.json();
  const status = statusResult?.status || 'PROCESSING';
  const result = statusResult?.result || null;
  if (status === 'SUCCESS' && result?.result) {
    return NextResponse.json({ status: 'SUCCESS', pdfBase64: result.result });
  }
  if (status === 'FAILED') {
    return NextResponse.json({ status: 'FAILED', error: result?.error || 'PDF generation failed' });
  }
  return NextResponse.json({ status: 'PROCESSING' });
}
