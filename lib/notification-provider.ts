type EmailMessage = {
  recipient: string;
  subject: string;
  html: string;
  providerTemplateKey: string | null;
  replyTo?: string | null;
};

export type ProviderResult = { provider: string; messageId: string | null };

export async function sendEmail(message: EmailMessage): Promise<ProviderResult> {
  const deploymentToken = process.env.ABACUSAI_API_KEY;
  const appId = process.env.WEB_APP_ID;
  const notificationId = message.providerTemplateKey
    ? process.env[message.providerTemplateKey]
    : undefined;
  if (!deploymentToken || !appId || !notificationId) {
    throw new Error('Email provider configuration is incomplete');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        deployment_token: deploymentToken,
        app_id: appId,
        notification_id: notificationId,
        subject: message.subject,
        body: message.html,
        is_html: true,
        recipient_email: message.recipient,
        reply_to: message.replyTo || undefined,
        sender_email: 'praxis@thepraxisexchange.com',
        sender_alias: 'PAX — Praxis Exchange',
      }),
    });
    const result = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok || !result?.success) {
      throw new Error(`Email provider rejected request (${response.status})`);
    }
    const messageId = typeof result.message_id === 'string'
      ? result.message_id
      : typeof result.id === 'string' ? result.id : null;
    return { provider: 'ABACUS_NOTIFICATION_API', messageId };
  } finally {
    clearTimeout(timeout);
  }
}

