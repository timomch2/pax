export const dynamic = 'force-dynamic';

import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const incidentSchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(20).max(20_000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  personalDataInvolved: z.boolean().default(false),
  affectedSubjects: z.number().int().nonnegative().nullable().optional(),
  detectedAt: z.string().datetime(),
  assignedToId: z.string().cuid().nullable().optional(),
}).strict();

export async function GET(request: Request) {
  const allowed = await requirePermission('security.incident.read', { entityType: 'SecurityIncident' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const incidents = await prisma.securityIncident.findMany({
    include: { reporter: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: [{ status: 'asc' }, { severity: 'desc' }, { detectedAt: 'desc' }], take: 200,
  });
  return NextResponse.json({ incidents });
}

export async function POST(request: Request) {
  const allowed = await requirePermission('security.incident.create', { entityType: 'SecurityIncident' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = incidentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid incident', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const incident = await prisma.securityIncident.create({
    data: {
      ...parsed.data,
      reference: `PAX-INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(4).toString('hex').toUpperCase()}`,
      reporterId: allowed.userId,
      detectedAt: new Date(parsed.data.detectedAt),
    },
  });
  await logAudit({ userId: allowed.userId, action: 'SECURITY_INCIDENT_CREATED', entityType: 'SecurityIncident', entityId: incident.id, outcome: 'SUCCESS', request, context: { severity: incident.severity, personalDataInvolved: incident.personalDataInvolved } });
  return NextResponse.json({ incident }, { status: 201 });
}
