export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const updateSchema = z.object({
  status: z.enum(['OPEN', 'CONTAINED', 'INVESTIGATING', 'REMEDIATED', 'CLOSED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedToId: z.string().cuid().nullable().optional(),
  affectedSubjects: z.number().int().nonnegative().nullable().optional(),
  remediation: z.string().trim().max(20_000).nullable().optional(),
  authorityNotifiedAt: z.string().datetime().nullable().optional(),
  subjectsNotifiedAt: z.string().datetime().nullable().optional(),
}).strict();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const allowed = await requirePermission('security.incident.update', { entityType: 'SecurityIncident', resourceId: params.id }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid incident update' }, { status: 400 });
  const existing = await prisma.securityIncident.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  if (parsed.data.status === 'CLOSED' && !parsed.data.remediation && !existing.remediation) {
    return NextResponse.json({ error: 'Remediation must be documented before closure' }, { status: 400 });
  }
  const incident = await prisma.securityIncident.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      ...(parsed.data.authorityNotifiedAt !== undefined ? { authorityNotifiedAt: parsed.data.authorityNotifiedAt ? new Date(parsed.data.authorityNotifiedAt) : null } : {}),
      ...(parsed.data.subjectsNotifiedAt !== undefined ? { subjectsNotifiedAt: parsed.data.subjectsNotifiedAt ? new Date(parsed.data.subjectsNotifiedAt) : null } : {}),
      ...(parsed.data.status === 'CONTAINED' && !existing.containedAt ? { containedAt: new Date() } : {}),
      ...(parsed.data.status === 'CLOSED' ? { closedAt: new Date() } : {}),
    },
  });
  await logAudit({ userId: allowed.userId, action: 'SECURITY_INCIDENT_UPDATED', entityType: 'SecurityIncident', entityId: incident.id, outcome: 'SUCCESS', request, context: { from: existing.status, to: incident.status } });
  return NextResponse.json({ incident });
}
