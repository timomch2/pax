import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { ROLE_PERMISSION_KEYS } from '@/lib/permissions';
import { strongPasswordSchema } from '@/lib/password-policy';
import { verifyPaystackWebhook } from '@/lib/paystack';

test('clinical and safety permissions are deny-by-default for non-authorized roles', () => {
  for (const role of ['INNOVATOR', 'INVESTOR', 'EMPLOYER', 'PATIENT'] as const) {
    assert.equal(ROLE_PERMISSION_KEYS[role].includes('hub.patient.read'), false);
    assert.equal(ROLE_PERMISSION_KEYS[role].includes('safety.signal.read'), false);
  }
  assert.equal(ROLE_PERMISSION_KEYS.PRACTITIONER.includes('hub.patient.read'), true);
  assert.equal(ROLE_PERMISSION_KEYS.PRACTITIONER.includes('safety.signal.read'), false);
  assert.equal(ROLE_PERMISSION_KEYS.POLICYMAKER.includes('safety.signal.read'), true);
});

test('password policy rejects weak passwords and accepts a strong passphrase', () => {
  assert.equal(strongPasswordSchema.safeParse('password').success, false);
  assert.equal(strongPasswordSchema.safeParse('Long-enough-PAX-Password-26').success, true);
});

test('Paystack webhook verification uses the documented SHA-512 HMAC', () => {
  const previous = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = 'test-secret-only';
  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref-1' } });
  const signature = createHmac('sha512', 'test-secret-only').update(body).digest('hex');
  assert.equal(verifyPaystackWebhook(body, signature), true);
  assert.equal(verifyPaystackWebhook(`${body}x`, signature), false);
  if (previous === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = previous;
});
