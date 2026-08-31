import { Prisma, type NotificationChannel } from '@prisma/client';
import { prisma } from '@/lib/db';

type DatabaseClient = typeof prisma | Prisma.TransactionClient;

export type NotificationVariables = Record<string, string | number | boolean | null>;

export type EnqueueNotificationInput = {
  userId?: string | null;
  templateSlug: string;
  locale?: string;
  variables: NotificationVariables;
  recipient: string;
  channel?: NotificationChannel;
  idempotencyKey: string;
  priority?: number;
};

const SENSITIVE_VARIABLE = /(patient|diagnos|medicine|drug|clinical|health|national.?id|passport)/i;

export async function enqueueNotification(
  db: DatabaseClient,
  input: EnqueueNotificationInput,
) {
  const channel = input.channel ?? 'EMAIL';
  const locale = input.locale ?? 'en';
  const template = await db.notificationTemplate.findFirst({
    where: { slug: input.templateSlug, channel, locale, enabled: true },
    orderBy: { version: 'desc' },
  });
  if (!template) throw new Error(`Enabled notification template not found: ${input.templateSlug}`);

  const supplied = Object.keys(input.variables);
  const missing = template.requiredVariables.filter((key) => !(key in input.variables));
  const undeclared = supplied.filter((key) => !template.requiredVariables.includes(key));
  if (missing.length || undeclared.length) {
    throw new Error(`Notification variables do not match template ${template.slug}`);
  }
  if (!template.sensitiveAllowed && supplied.some((key) => SENSITIVE_VARIABLE.test(key))) {
    throw new Error(`Sensitive notification variable is not allowed for template ${template.slug}`);
  }

  return db.notificationEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      userId: input.userId ?? null,
      templateSlug: template.slug,
      templateVersion: template.version,
      locale,
      variables: input.variables as Prisma.InputJsonValue,
      idempotencyKey: input.idempotencyKey,
      priority: input.priority ?? 0,
      deliveries: {
        create: { channel, recipient: input.recipient.trim().toLowerCase() },
      },
    },
    include: { deliveries: true },
  });
}

function escapeHtml(value: string): string {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;')
    .split('\n').join('<br>');
}

export function renderNotificationTemplate(
  source: string,
  requiredVariables: string[],
  variables: NotificationVariables,
): string {
  let rendered = source;
  for (const key of requiredVariables) {
    if (!(key in variables)) throw new Error(`Missing notification variable: ${key}`);
    rendered = rendered.split(`{{${key}}}`).join(escapeHtml(String(variables[key] ?? '')));
  }
  if (/{{\s*[a-zA-Z0-9_.-]+\s*}}/.test(rendered)) {
    throw new Error('Notification contains an unresolved variable');
  }
  return rendered;
}

export function renderNotificationTextTemplate(
  source: string,
  requiredVariables: string[],
  variables: NotificationVariables,
): string {
  let rendered = source;
  for (const key of requiredVariables) {
    if (!(key in variables)) throw new Error(`Missing notification variable: ${key}`);
    rendered = rendered.split(`{{${key}}}`).join(String(variables[key] ?? ''));
  }
  if (/{{\s*[a-zA-Z0-9_.-]+\s*}}/.test(rendered)) throw new Error('Notification contains an unresolved variable');
  return rendered;
}

export async function enqueueInAppNotification(
  db: DatabaseClient,
  input: Omit<EnqueueNotificationInput, 'recipient' | 'channel'> & { userId: string },
) {
  return enqueueNotification(db, { ...input, recipient: input.userId, channel: 'IN_APP' });
}
