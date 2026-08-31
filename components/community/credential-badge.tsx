'use client';

import { BadgeCheck, ShieldCheck, Circle } from 'lucide-react';
import { credentialBadge } from '@/lib/credibility';

// A compact credential pill that turns a membership tier into the public
// credential the community recognises: Basic / Verified Professional /
// Peer-Vouched Expert. Used across debate cards, contribution authors,
// member profiles and marketplace listings so standing is visible everywhere.
export function CredentialBadge({
  tier,
  size = 'sm',
  showIcon = true,
  variant = 'full',
}: {
  tier?: string | null;
  size?: 'xs' | 'sm';
  showIcon?: boolean;
  variant?: 'full' | 'short';
}) {
  const b = credentialBadge(tier);
  const label = variant === 'short' ? b.short : b.label;
  const Icon =
    tier === 'TIER3_EXPERT' ? BadgeCheck : tier === 'TIER2_PROFESSIONAL' ? ShieldCheck : Circle;
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  const iconSize = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${pad} ${b.className}`}
      title={b.label}
    >
      {showIcon && <Icon className={iconSize} />}
      {label}
    </span>
  );
}
