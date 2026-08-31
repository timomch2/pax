// Credential badges + credibility helpers shared across the PAX Exchange
// Community & Debate Hub. Client-safe (no prisma / server imports).
//
// The credential badge is the *public face* of a member's standing: it maps a
// membership tier to the descriptive credential the community recognises
// (Basic / Verified Professional / Peer-Vouched Expert), matching the tier
// blurbs in lib/access.ts.

export interface CredentialBadgeDef {
  label: string;
  short: string;
  className: string;
  dotColor: string;
}

const CREDENTIAL_BADGES: Record<string, CredentialBadgeDef> = {
  TIER1_BASIC: {
    label: 'Basic Member',
    short: 'Basic',
    className: 'border border-white/15 bg-white/5 text-white/70',
    dotColor: '#2D9B94',
  },
  TIER2_PROFESSIONAL: {
    label: 'Verified Professional',
    short: 'Verified',
    className: 'border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FBBF24]',
    dotColor: '#F59E0B',
  },
  TIER3_EXPERT: {
    label: 'Peer-Vouched Expert',
    short: 'Expert',
    className: 'border border-[#8B7FD4]/40 bg-[#8B7FD4]/15 text-[#b6acef]',
    dotColor: '#8B7FD4',
  },
};

export function credentialBadge(tier?: string | null): CredentialBadgeDef {
  return CREDENTIAL_BADGES[tier ?? 'TIER1_BASIC'] ?? CREDENTIAL_BADGES.TIER1_BASIC;
}

// A qualitative band for a 0-100 credibility score, used for compact labels.
export function credibilityBand(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Highly Credible', color: '#2ABFB0' };
  if (score >= 50) return { label: 'Established', color: '#FBBF24' };
  if (score >= 25) return { label: 'Emerging', color: '#8B7FD4' };
  return { label: 'New Contributor', color: 'rgba(255,255,255,0.6)' };
}
