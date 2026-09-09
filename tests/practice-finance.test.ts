import test from 'node:test';
import assert from 'node:assert/strict';
import { clinicalInvoiceTotals, adjustedResponsibility, approvedWithholding } from '@/lib/practice-finance-math';

test('tax and withholding arithmetic uses exact cents and separately reports cash-independent withholding', () => {
  assert.deepEqual(clinicalInvoiceTotals([10000], { rateBps: 1600, inclusive: false, base: 'NET' }, { rateBps: 500, inclusive: false, base: 'NET' }), { netMinor: 10000, taxMinor: 1600, totalMinor: 11600, expectedWithholdingMinor: 500 });
  assert.deepEqual(clinicalInvoiceTotals([11600], { rateBps: 1600, inclusive: true, base: 'NET' }, null), { netMinor: 10000, taxMinor: 1600, totalMinor: 11600, expectedWithholdingMinor: 0 });
  assert.deepEqual(clinicalInvoiceTotals([1], { rateBps: 5000, inclusive: false, base: 'NET' }, null), { netMinor: 1, taxMinor: 1, totalMinor: 2, expectedWithholdingMinor: 0 });
  assert.throws(() => clinicalInvoiceTotals([2000000000, 1], null, null));
  assert.throws(() => clinicalInvoiceTotals([10000], { rateBps: 10000, inclusive: false, base: 'GROSS' }, null));
});
test('unapproved discounts and withholding never settle balances', () => {
  const pending = [{ kind: 'DISCOUNT', status: 'PENDING', amountMinor: 100 }, { kind: 'WITHHOLDING', status: 'PENDING', amountMinor: 50 }];
  assert.equal(adjustedResponsibility(1000, pending), 1000);
  assert.equal(approvedWithholding(pending), 0);
  assert.equal(adjustedResponsibility(1000, pending.map((row) => ({ ...row, status: 'APPROVED' }))), 900);
  assert.equal(approvedWithholding(pending.map((row) => ({ ...row, status: 'APPROVED' }))), 50);
});
