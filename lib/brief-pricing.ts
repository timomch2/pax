// Consensus-brief monetization config (first-party PAX revenue).
// Abstract is always free; the detailed brief is paid — except during the pilot,
// when full briefs are free. Flip BRIEF_PILOT_FREE="false" in .env to switch
// the paywall on once the pilot ends.

export const BRIEF_PRICE_CENTS = 99;          // $0.99
export const BRIEF_PRICE_USD = 0.99;
export const BRIEF_CURRENCY = 'USD';
export const BRIEF_PRICE_LABEL = '$0.99';

// Pilot defaults to FREE unless explicitly turned off.
export function isPilotFree(): boolean {
  return (process.env.BRIEF_PILOT_FREE ?? 'true').toLowerCase() !== 'false';
}

// Whether a live payment provider is wired up (keys present).
export function isPaymentConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PUBLIC_KEY);
}
