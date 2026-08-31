// Shared formatting helpers for the PAX platform (currency: Kenyan Shilling).

export function formatKSh(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `KSh ${value.toLocaleString('en-KE')}`;
}

export function formatKShCompact(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  if (value >= 1_000_000) {
    return `KSh ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `KSh ${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
  }
  return `KSh ${value.toLocaleString('en-KE')}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  });
}

export function pct(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}
