export const dynamic = 'force-dynamic';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { enqueueNotification, renderNotificationTemplate } from '@/lib/notification-service';

const previewSchema = z.object({
  variables: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  testRecipient: z.string().email().max(320).optional(),
}).strict();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const allowed = await requirePermission('notification.template.update', { entityType: 'NotificationTemplate', resourceId: params.id }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = previewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preview request' }, { status: 400 });
  const template = await prisma.notificationTemplate.findUnique({ where: { id: params.id } });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  try {
    const subject = renderNotificationTemplate(template.subject || '', template.requiredVariables, parsed.data.variables);
    const body = renderNotificationTemplate(template.body, template.requiredVariables, parsed.data.variables);
    if (parsed.data.testRecipient) {
      if (!template.enabled) return NextResponse.json({ error: 'Activate this version before sending a test' }, { status: 409 });
      await enqueueNotification(prisma, { templateSlug: template.slug, locale: template.locale, channel: template.channel, recipient: parsed.data.testRecipient, variables: parsed.data.variables, idempotencyKey: `template-test:${template.id}:${randomUUID()}` });
    }
    return NextResponse.json({ preview: { subject, body }, testQueued: Boolean(parsed.data.testRecipient) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Template rendering failed' }, { status: 400 });
  }
}
