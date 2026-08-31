import { randomUUID } from 'crypto';

export async function verifyTurnstile(request: Request, token?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!token || token.length > 2048) return false;
  const forwarded = request.headers.get('x-forwarded-for');
  const remoteip = forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || undefined;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip, idempotency_key: randomUUID() }),
  });
  if (!response.ok) return false;
  const result = await response.json().catch(() => null) as { success?: boolean } | null;
  return result?.success === true;
}

