export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const templateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/).max(120),
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP']),
  locale: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).default('en'),
  subject: z.string().max(300).nullable().optional(),
  body: z.string().min(1).max(50_000),
  actionLabel: z.string().max(100).nullable().optional(),
  actionUrl: z.string().max(2_000).nullable().optional(),
  requiredVariables: z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/)).max(100).default([]),
  sensitiveAllowed: z.boolean().default(false),
  nonDisableable: z.boolean().default(false),
  providerTemplateKey: z.string().regex(/^NOTIF_ID_[A-Z0-9_]+$/).nullable().optional(),
  enableVersion: z.boolean().default(false),
}).strict();

export async function GET(request: Request) {
  const allowed = await requirePermission('notification.template.read', { entityType: 'NotificationTemplate' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const templates = await prisma.notificationTemplate.findMany({ orderBy: [{ slug: 'asc' }, { channel: 'asc' }, { locale: 'asc' }, { version: 'desc' }] });
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const allowed = await requirePermission('notification.template.create', { entityType: 'NotificationTemplate' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = templateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid template', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { enableVersion, requiredVariables, ...data } = parsed.data;
  const latest = await prisma.notificationTemplate.findFirst({ where: { slug: data.slug, channel: data.channel, locale: data.locale }, orderBy: { version: 'desc' }, select: { version: true } });
  const template = await prisma.$transaction(async (tx) => {
    if (enableVersion) await tx.notificationTemplate.updateMany({ where: { slug: data.slug, channel: data.channel, locale: data.locale }, data: { enabled: false } });
    return tx.notificationTemplate.create({ data: { ...data, version: (latest?.version || 0) + 1, requiredVariables: [...new Set(requiredVariables)], enabled: enableVersion, createdById: allowed.userId } });
  });
  await logAudit({ userId: allowed.userId, action: 'NOTIFICATION_TEMPLATE_VERSION_CREATED', entityType: 'NotificationTemplate', entityId: template.id, outcome: 'SUCCESS', request, context: { slug: template.slug, version: template.version, enabled: template.enabled } });
  return NextResponse.json({ template }, { status: 201 });
}
