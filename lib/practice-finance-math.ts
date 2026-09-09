import { PracticeError } from '@/lib/practice-policy';
export type ClinicalRate = { rateBps: number; inclusive: boolean; base: string };
export const MAX_CLINICAL_MINOR = 2000000000;

export function checkedMinor(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_CLINICAL_MINOR) throw new PracticeError(400, 'Money amount is invalid or exceeds the supported limit');
  return value;
}
export function roundedRatio(value: number, numerator: number, denominator: number): number {
  checkedMinor(value);
  if (!Number.isSafeInteger(numerator) || numerator < 0 || !Number.isSafeInteger(denominator) || denominator <= 0) throw new Error('Invalid rate');
  return checkedMinor(Number((BigInt(value) * BigInt(numerator) + BigInt(denominator) / 2n) / BigInt(denominator)));
}

/** All rounding is half-up in integer minor units; no statutory rates or floating-point percentages. */
export function clinicalInvoiceTotals(amounts: number[], tax: ClinicalRate | null, withholding: ClinicalRate | null) {
  const subtotal = checkedMinor(amounts.reduce((sum, value) => sum + checkedMinor(value), 0));
  for (const rate of [tax, withholding]) if (rate && (!Number.isInteger(rate.rateBps) || rate.rateBps < 0 || rate.rateBps > 10000 || !['NET', 'GROSS'].includes(rate.base))) throw new Error('Invalid percentage rate');
  let netMinor = subtotal, taxMinor = 0;
  if (tax?.rateBps) {
    if (tax.inclusive) {
      if (tax.base === 'NET') { netMinor = roundedRatio(subtotal, 10000, 10000 + tax.rateBps); taxMinor = subtotal - netMinor; }
      else { taxMinor = roundedRatio(subtotal, tax.rateBps, 10000); netMinor = subtotal - taxMinor; }
    } else taxMinor = roundedRatio(subtotal, tax.rateBps, tax.base === 'NET' ? 10000 : 10000 - tax.rateBps);
  }
  const totalMinor = checkedMinor(netMinor + taxMinor);
  const expectedWithholdingMinor = withholding ? roundedRatio(withholding.base === 'GROSS' ? totalMinor : netMinor, withholding.rateBps, 10000) : 0;
  return { netMinor, taxMinor, totalMinor, expectedWithholdingMinor };
}

export type AdjustmentAmount = { kind: string; status: string; amountMinor: number };
export function adjustedResponsibility(originalMinor: number, adjustments: AdjustmentAmount[]): number {
  return adjustments.filter((row) => row.status === 'APPROVED').reduce((sum, row) => {
    if (['CREDIT_NOTE', 'DISCOUNT'].includes(row.kind)) return sum - row.amountMinor;
    if (row.kind === 'CHARGE_INCREASE') return sum + row.amountMinor;
    return sum;
  }, originalMinor);
}

export function approvedWithholding(adjustments: AdjustmentAmount[]): number {
  return adjustments.filter((row) => row.status === 'APPROVED' && row.kind === 'WITHHOLDING').reduce((sum, row) => sum + row.amountMinor, 0);
}
