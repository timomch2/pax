import assert from 'node:assert/strict';
import test from 'node:test';
import { mpesaCallbackSignature, normalizeKenyanPhone, verifyMpesaCallbackSignature } from '@/lib/mpesa';
import { SAFETY_SEVERITY_POINTS, safetySignalLevel } from '@/lib/safety-signals';

test('M-Pesa phone normalization accepts Kenyan mobile formats only', () => {
  assert.equal(normalizeKenyanPhone('0712 345 678'), '254712345678');
  assert.equal(normalizeKenyanPhone('+254 112 345 678'), '254112345678');
  assert.equal(normalizeKenyanPhone('0201234567'), null);
});

test('M-Pesa callback path signature is purpose-bound and timing-safe verified', () => {
  const previous = process.env.MPESA_CALLBACK_SECRET;
  process.env.MPESA_CALLBACK_SECRET = 'local-contract-test';
  const signature = mpesaCallbackSignature('stk');
  assert.equal(verifyMpesaCallbackSignature(signature, 'stk'), true);
  assert.equal(verifyMpesaCallbackSignature(signature, 'c2b'), false);
  if (previous === undefined) delete process.env.MPESA_CALLBACK_SECRET;
  else process.env.MPESA_CALLBACK_SECRET = previous;
});

test('safety score constants match the declared signal algorithm', () => {
  assert.deepEqual(SAFETY_SEVERITY_POINTS, { MILD: 1, MODERATE: 2, SEVERE: 4, LIFE_THREATENING: 6 });
  assert.equal(safetySignalLevel(2), 'LOW');
  assert.equal(safetySignalLevel(3), 'WATCH');
  assert.equal(safetySignalLevel(6), 'ELEVATED');
  assert.equal(safetySignalLevel(12), 'CRITICAL');
});
