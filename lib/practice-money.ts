/** Convert user-entered shillings to minor units without binary floating-point arithmetic. */
export function moneyToMinor(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter an amount with up to two decimal places');
  const [whole, fraction = ''] = value.trim().split('.');
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (amount > 2000000000n) throw new Error('Amount exceeds the supported limit');
  return Number(amount);
}

export function formatPracticeMoney(minor: number): string {
  return `KSh ${(minor / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
