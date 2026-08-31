export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const allowed = await requirePermission('notification.template.update', { entityType: 'NotificationTemplate', resourceId: params.id }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const template = await prisma.notificationTemplate.findUnique({ where: { id: params.id } });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  const activated = await prisma.$transaction(async (tx) => {
    await tx.notificationTemplate.updateMany({ where: { slug: template.slug, channel: template.channel, locale: template.locale }, data: { enabled: false } });
    return tx.notificationTemplate.update({ where: { id: template.id }, data: { enabled: true } });
  });
  await logAudit({ userId: allowed.userId, action: 'NOTIFICATION_TEMPLATE_ACTIVATED', entityType: 'NotificationTemplate', entityId: activated.id, outcome: 'SUCCESS', request, context: { slug: activated.slug, version: activated.version } });
  return NextResponse.json({ template: activated });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const allowed = await requirePermission('notification.template.delete', { entityType: 'NotificationTemplate', resourceId: params.id }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const template = await prisma.notificationTemplate.findUnique({ where: { id: params.id } });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (template.nonDisableable) return NextResponse.json({ error: 'This safety or security template cannot be disabled' }, { status: 409 });
  await prisma.notificationTemplate.update({ where: { id: template.id }, data: { enabled: false } });
  await logAudit({ userId: allowed.userId, action: 'NOTIFICATION_TEMPLATE_DISABLED', entityType: 'NotificationTemplate', entityId: template.id, outcome: 'SUCCESS', request });
  return NextResponse.json({ disabled: true });
}
