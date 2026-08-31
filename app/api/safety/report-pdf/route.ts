export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFileUrl } from '@/lib/s3';
import { requirePermission } from '@/lib/authorization';

const FILE_RE = /^PAX_Quarterly_Surveillance_Q\d_\d{4}\.pdf$/;

// GET — redirect authorized safety staff to a short-lived signed report URL.
export async function GET(req: NextRequest) {
  const auth = await requirePermission('safety.export', {}, req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = new URL(req.url);
  const file = searchParams.get('file');

  if (!file || !FILE_RE.test(file)) {
    return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
  }

  const cloudStoragePath = `${process.env.AWS_FOLDER_PREFIX}reports/${file}`;
  try {
    const url = await getFileUrl(cloudStoragePath, 'application/pdf', file);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error('Report PDF error:', e);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
