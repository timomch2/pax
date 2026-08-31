export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { registerMpesaC2bUrls } from '@/lib/mpesa';
import { logAudit } from '@/lib/audit';

export async function POST(request: Request) {
  const allowed = await requirePermission('billing.reconcile', { entityType: 'MpesaC2bConfiguration' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  try {
    const origin = process.env.NEXTAUTH_URL || new URL(request.url).origin;
    await registerMpesaC2bUrls(origin);
    await logAudit({ userId: allowed.userId, action: 'MPESA_C2B_URLS_REGISTERED', entityType: 'MpesaC2bConfiguration', outcome: 'SUCCESS', request });
    return NextResponse.json({ registered: true });
  } catch {
    return NextResponse.json({ error: 'M-Pesa C2B URL registration failed' }, { status: 502 });
  }
}
