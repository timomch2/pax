export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const policySchema = z.object({
  dataCategory: z.enum(['EXPIRED_AUTH_TOKENS', 'EXPIRED_SESSIONS', 'PROCESSED_WEBHOOK_EVENTS', 'OPERATIONAL_JOB_RUNS', 'NOTIFICATION_DELIVERY_IDENTIFIERS']),
  description: z.string().trim().min(10).max(4_000),
  legalBasis: z.string().trim().min(10).max(4_000),
  retentionDays: z.number().int().positive().max(36_500),
  action: z.enum(['DELETE', 'DEIDENTIFY', 'ARCHIVE', 'REVIEW']),
  active: z.boolean().default(false),
  approvedBy: z.string().trim().max(160).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.active && !value.approvedBy) context.addIssue({ code: 'custom', path: ['approvedBy'], message: 'Approval is required before activation' });
  if (value.dataCategory === 'NOTIFICATION_DELIVERY_IDENTIFIERS' && value.action !== 'DEIDENTIFY') {
    context.addIssue({ code: 'custom', path: ['action'], message: 'Notification identifiers may only be deidentified' });
  }
  if (value.dataCategory !== 'NOTIFICATION_DELIVERY_IDENTIFIERS' && value.action === 'DEIDENTIFY') {
    context.addIssue({ code: 'custom', path: ['action'], message: 'This category supports DELETE or REVIEW only' });
  }
});

export async function GET(request: Request) {
  const allowed = await requirePermission('privacy.retention.manage', { entityType: 'DataRetentionPolicy' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  return NextResponse.json({ policies: await prisma.dataRetentionPolicy.findMany({ orderBy: { dataCategory: 'asc' } }) });
}

export async function PUT(request: Request) {
  const allowed = await requirePermission('privacy.retention.manage', { entityType: 'DataRetentionPolicy' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = policySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid retention policy', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const policy = await prisma.dataRetentionPolicy.upsert({
    where: { dataCategory: parsed.data.dataCategory },
    create: { ...parsed.data, approvedAt: parsed.data.active ? new Date() : null },
    update: { ...parsed.data, approvedAt: parsed.data.active ? new Date() : null },
  });
  await logAudit({ userId: allowed.userId, action: 'RETENTION_POLICY_UPSERTED', entityType: 'DataRetentionPolicy', entityId: policy.id, outcome: 'SUCCESS', request, context: { active: policy.active } });
  return NextResponse.json({ policy });
}
