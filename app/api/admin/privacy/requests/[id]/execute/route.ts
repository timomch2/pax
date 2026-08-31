export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { logAudit } from '@/lib/audit';
import { executeErasureRequest } from '@/lib/privacy-erasure';

const schema = z.object({ confirmation: z.literal('ERASE PERSONAL DATA') }).strict();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const allowed = await requirePermission('privacy.case.execute', { entityType: 'DataSubjectRequest', resourceId: params.id }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Explicit erasure confirmation is required' }, { status: 400 });
  try {
    const result = await executeErasureRequest(params.id, allowed.userId);
    await logAudit({ userId: allowed.userId, action: 'PRIVACY_ERASURE_EXECUTED', entityType: 'DataSubjectRequest', entityId: params.id, outcome: 'SUCCESS', request });
    return NextResponse.json({ request: result });
  } catch (error) {
    await logAudit({ userId: allowed.userId, action: 'PRIVACY_ERASURE_EXECUTED', entityType: 'DataSubjectRequest', entityId: params.id, outcome: 'FAILURE', request });
    const message = error instanceof Error ? error.message : 'Erasure failed';
    return NextResponse.json({ error: message }, { status: message.endsWith('NOT_FOUND') ? 404 : 409 });
  }
}
