export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const retrySchema = z.object({ eventId: z.string().cuid() }).strict();

export async function GET(request: Request) {
  const allowed = await requirePermission('notification.template.read', { entityType: 'NotificationEvent' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const [counts, recent] = await Promise.all([
    prisma.notificationEvent.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.notificationEvent.findMany({
      orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, templateSlug: true, templateVersion: true, status: true, attempts: true, maxAttempts: true, availableAt: true, processedAt: true, lastError: true, createdAt: true, deliveries: { select: { channel: true, status: true, provider: true, providerMessageId: true, attempts: true, lastError: true, sentAt: true } } },
    }),
  ]);
  return NextResponse.json({ counts, recent });
}

export async function POST(request: Request) {
  const allowed = await requirePermission('notification.template.update', { entityType: 'NotificationEvent' }, request);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  const parsed = retrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  const event = await prisma.notificationEvent.findUnique({ where: { id: parsed.data.eventId } });
  if (!event || !['DEAD_LETTER', 'RETRY'].includes(event.status)) return NextResponse.json({ error: 'Event is not retryable' }, { status: 409 });
  await prisma.$transaction([
    prisma.notificationEvent.update({ where: { id: event.id }, data: { status: 'RETRY', attempts: 0, availableAt: new Date(), lockedAt: null, lastError: null } }),
    prisma.notificationDelivery.updateMany({ where: { eventId: event.id, status: { in: ['DEAD_LETTER', 'FAILED'] } }, data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastError: null, deadLetteredAt: null } }),
  ]);
  await logAudit({ userId: allowed.userId, action: 'NOTIFICATION_EVENT_REQUEUED', entityType: 'NotificationEvent', entityId: event.id, outcome: 'SUCCESS', request });
  return NextResponse.json({ queued: true });
}
