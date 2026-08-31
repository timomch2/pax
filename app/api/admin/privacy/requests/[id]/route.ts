export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const updateSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'IN_REVIEW', 'WAITING_USER', 'PARTIALLY_COMPLETED', 'COMPLETED', 'REJECTED']),
  assignedToId: z.string().cuid().nullable().optional(),
  note: z.string().trim().max(4_000).nullable().optional(),
  resolution: z.string().trim().max(10_000).nullable().optional(),
}).strict();

const transitions: Record<string, string[]> = {
  RECEIVED: ['ACKNOWLEDGED', 'IN_REVIEW'],
  ACKNOWLEDGED: ['IN_REVIEW', 'WAITING_USER', 'REJECTED'],
  IN_REVIEW: ['WAITING_USER', 'PARTIALLY_COMPLETED', 'COMPLETED', 'REJECTED'],
  WAITING_USER: ['IN_REVIEW', 'PARTIALLY_COMPLETED', 'COMPLETED', 'REJECTED'],
  PARTIALLY_COMPLETED: ['IN_REVIEW', 'COMPLETED'],
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const allowed = await requirePermission('privacy.case.update', { entityType: 'DataSubjectRequest', resourceId: params.id }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid case update' }, { status: 400 });
  const existing = await prisma.dataSubjectRequest.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  if (!transitions[existing.status]?.includes(parsed.data.status)) return NextResponse.json({ error: 'Invalid status transition' }, { status: 409 });
  if (['COMPLETED', 'PARTIALLY_COMPLETED', 'REJECTED'].includes(parsed.data.status) && !parsed.data.resolution) {
    return NextResponse.json({ error: 'A written resolution is required' }, { status: 400 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const value = await tx.dataSubjectRequest.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.assignedToId !== undefined ? { assignedToId: parsed.data.assignedToId } : {}),
        ...(parsed.data.resolution !== undefined ? { resolution: parsed.data.resolution } : {}),
        ...(parsed.data.status === 'ACKNOWLEDGED' ? { acknowledgedAt: new Date() } : {}),
        ...(['COMPLETED', 'PARTIALLY_COMPLETED', 'REJECTED'].includes(parsed.data.status) ? { completedAt: new Date() } : {}),
      },
    });
    await tx.dataSubjectRequestEvent.create({
      data: { requestId: existing.id, fromStatus: existing.status, toStatus: parsed.data.status, actorId: allowed.userId, note: parsed.data.note || null },
    });
    return value;
  });
  await logAudit({ userId: allowed.userId, action: 'PRIVACY_CASE_UPDATED', entityType: 'DataSubjectRequest', entityId: existing.id, outcome: 'SUCCESS', request, context: { from: existing.status, to: updated.status } });
  return NextResponse.json({ request: updated });
}
