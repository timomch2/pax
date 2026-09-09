import { prisma } from '@/lib/db';
import { renderNotificationTemplate, renderNotificationTextTemplate } from '@/lib/notification-service';
import { practiceDeliveryAllowed } from '@/lib/practice-delivery';
import { sendEmail } from '@/lib/notification-provider';

const RETRY_SECONDS = [60, 5 * 60, 30 * 60, 2 * 60 * 60, 6 * 60 * 60];

export async function processNotificationBatch(limit = 25): Promise<{ processed: number }> {
  await recoverStaleClaims();
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const event = await claimNextEvent();
    if (!event) break;
    await processEvent(event.id);
    processed += 1;
  }
  return { processed };
}

async function recoverStaleClaims(): Promise<void> {
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.notificationEvent.updateMany({
    where: { status: 'PROCESSING', lockedAt: { lt: staleBefore } },
    data: { status: 'RETRY', lockedAt: null, availableAt: new Date(), lastError: 'Recovered stale worker claim' },
  });
}

async function claimNextEvent() {
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.notificationEvent.findFirst({
      where: {
        status: { in: ['PENDING', 'RETRY'] },
        availableAt: { lte: new Date() },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (!candidate) return null;
    const claimed = await tx.notificationEvent.updateMany({
      where: { id: candidate.id, status: { in: ['PENDING', 'RETRY'] } },
      data: { status: 'PROCESSING', lockedAt: new Date() },
    });
    return claimed.count === 1 ? candidate : null;
  });
}

async function processEvent(eventId: string): Promise<void> {
  const event = await prisma.notificationEvent.findUnique({
    where: { id: eventId },
    include: { deliveries: true, user: { include: { notificationPreference: true } } },
  });
  if (!event) return;

  const template = await prisma.notificationTemplate.findUnique({
    where: {
      slug_channel_locale_version: {
        slug: event.templateSlug,
        channel: event.deliveries[0]?.channel ?? 'EMAIL',
        locale: event.locale,
        version: event.templateVersion,
      },
    },
  });
  if (!template) return failEvent(event.id, event.attempts, event.maxAttempts, 'Template version not found');

  try {
    const variables = event.variables as Record<string, string | number | boolean | null>;
    for (const delivery of event.deliveries) {
      if (delivery.status === 'SENT' || delivery.status === 'DELIVERED' || delivery.status === 'SKIPPED') continue;
      if (!(await practiceDeliveryAllowed(event.idempotencyKey, delivery.recipient))) {
        await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'SKIPPED', lastError: 'Practice notification is no longer current or permitted' } });
        continue;
      }
      const emailDisabled = delivery.channel === 'EMAIL' && event.user?.notificationPreference?.emailEnabled === false;
      if (emailDisabled && !template.nonDisableable) {
        await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'SKIPPED' } });
        continue;
      }
      if (delivery.channel === 'IN_APP') {
        if (!event.userId) throw new Error('In-app notification requires a user');
        const title = renderNotificationTextTemplate(template.subject || '', template.requiredVariables, variables);
        const message = renderNotificationTextTemplate(template.body, template.requiredVariables, variables);
        const link = template.actionUrl ? renderNotificationTextTemplate(template.actionUrl, template.requiredVariables, variables) : null;
        await prisma.$transaction(async (tx) => {
          const current = await tx.notificationDelivery.findUnique({ where: { id: delivery.id }, select: { providerMessageId: true } });
          if (current?.providerMessageId) return;
          const notification = await tx.notification.create({ data: { userId: event.userId!, title, message, type: 'INFO', link } });
          await tx.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', provider: 'PAX_IN_APP', providerMessageId: notification.id, attempts: { increment: 1 }, sentAt: new Date(), lastError: null } });
        });
        continue;
      }
      if (delivery.channel !== 'EMAIL') throw new Error(`Unsupported notification channel: ${delivery.channel}`);

      const subject = renderNotificationTemplate(template.subject || '', template.requiredVariables, variables);
      const html = renderNotificationTemplate(template.body, template.requiredVariables, variables);
      const result = await sendEmail({
        recipient: delivery.recipient,
        subject,
        html,
        providerTemplateKey: template.providerTemplateKey,
        replyTo: event.templateSlug === 'contact.submission' ? String(variables.email || '') : null,
      });
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SENT',
          provider: result.provider,
          providerMessageId: result.messageId,
          attempts: { increment: 1 },
          sentAt: new Date(),
          lastError: null,
        },
      });
    }
    await prisma.notificationEvent.update({
      where: { id: event.id },
      data: { status: 'COMPLETED', processedAt: new Date(), lockedAt: null, lastError: null },
    });
  } catch (error) {
    await failEvent(event.id, event.attempts, event.maxAttempts, error instanceof Error ? error.message : 'Delivery failed');
  }
}

async function failEvent(id: string, attempts: number, maxAttempts: number, error: string) {
  const nextAttempts = attempts + 1;
  const dead = nextAttempts >= maxAttempts;
  const delay = RETRY_SECONDS[Math.min(nextAttempts - 1, RETRY_SECONDS.length - 1)];
  await prisma.$transaction([
    prisma.notificationEvent.update({
      where: { id },
      data: {
        attempts: nextAttempts,
        status: dead ? 'DEAD_LETTER' : 'RETRY',
        availableAt: new Date(Date.now() + delay * 1000),
        lockedAt: null,
        lastError: error.slice(0, 2000),
      },
    }),
    prisma.notificationDelivery.updateMany({
      where: { eventId: id, status: { in: ['PENDING', 'FAILED', 'SENDING'] } },
      data: {
        status: dead ? 'DEAD_LETTER' : 'FAILED',
        attempts: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + delay * 1000),
        lastError: error.slice(0, 2000),
        deadLetteredAt: dead ? new Date() : null,
      },
    }),
  ]);
}
