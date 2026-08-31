export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST — Poll PDF generation status (same pattern as IP certificate)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { requestId } = await req.json();
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
