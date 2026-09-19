// Central source of truth for PAX user types (roles), membership tiers,
// and where each user lands after login. Keep this in sync with the
// UserRole and MembershipTier enums in prisma/schema.prisma.

import {
  Stethoscope,
  Lightbulb,
  TrendingUp,
  Building2,
  Landmark,
  HeartPulse,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export type UserRole =
  | 'MEMBER'
  | 'STAFF'
  | 'PRACTITIONER'
  | 'INNOVATOR'
  | 'INVESTOR'
  | 'EMPLOYER'
  | 'POLICYMAKER'
  | 'PATIENT'
  | 'ADMIN';

export type MembershipTier = 'TIER1_BASIC' | 'TIER2_PROFESSIONAL' | 'TIER3_EXPERT';

// ---------------------------------------------------------------------------
// User types ("who you are") — the five PAX registration types.
// PATIENT and ADMIN are intentionally excluded from the public sign-up list:
// patients live only inside the Practitioners Hub as records, and admins are
// provisioned internally. Both remain valid roles for existing accounts.
// ---------------------------------------------------------------------------

export interface UserTypeDef {
  value: Exclude<UserRole, 'PATIENT' | 'ADMIN' | 'STAFF' | 'MEMBER'>;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /** query-string alias used on /register?role=... */
  slug: string;
}

export const USER_TYPES: UserTypeDef[] = [
  {
    value: 'PRACTITIONER',
    label: 'Health Practitioner',
    shortLabel: 'Practitioner',
    description: 'Licensed professionals — doctors, nurses, pharmacists, clinical officers.',
    icon: Stethoscope,
    slug: 'practitioner',
  },
  {
    value: 'INNOVATOR',
    label: 'Innovator / Researcher',
    shortLabel: 'Innovator',
    description: 'Document gaps, submit and validate innovations, connect to funding.',
    icon: Lightbulb,
    slug: 'innovator',
  },
  {
    value: 'INVESTOR',
    label: 'Investor / Funder',
    shortLabel: 'Investor',
    description: 'Discover pre-vetted, de-risked opportunities in professional deal rooms.',
    icon: TrendingUp,
    slug: 'investor',
  },
  {
    value: 'EMPLOYER',
    label: 'Employer / Organisation',
    shortLabel: 'Employer',
    description: 'NGOs, hospitals, universities & companies. Post roles, find proven talent.',
    icon: Building2,
    slug: 'employer',
  },
  {
    value: 'POLICYMAKER',
    label: 'Policymaker / Government',
    shortLabel: 'Policymaker',
    description: 'Ministries, regulators & county teams. Monitor innovation and safety signals.',
    icon: Landmark,
    slug: 'policymaker',
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'PAX Member',
  STAFF: 'Practice staff',
  PRACTITIONER: 'Health Practitioner',
  INNOVATOR: 'Innovator / Researcher',
  INVESTOR: 'Investor / Funder',
  EMPLOYER: 'Employer / Organisation',
  POLICYMAKER: 'Policymaker / Government',
  PATIENT: 'Patient',
  ADMIN: 'Administrator',
};

const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  MEMBER: HeartPulse,
  STAFF: Shield,
  PRACTITIONER: Stethoscope,
  INNOVATOR: Lightbulb,
  INVESTOR: TrendingUp,
  EMPLOYER: Building2,
  POLICYMAKER: Landmark,
  PATIENT: HeartPulse,
  ADMIN: Shield,
};

export function roleLabel(role?: string | null): string {
  if (!role) return 'Member';
  return ROLE_LABELS[role as UserRole] ?? 'Member';
}

export function roleIcon(role?: string | null): LucideIcon {
  if (!role) return HeartPulse;
  return ROLE_ICONS[role as UserRole] ?? HeartPulse;
}

export function roleFromSlug(slug?: string | null): UserRole | null {
  if (!slug) return null;
  const match = USER_TYPES.find((t) => t.slug === slug.toLowerCase());
  return match?.value ?? null;
}

// ---------------------------------------------------------------------------
// Membership tiers ("access level") — separate axis from user type.
// ---------------------------------------------------------------------------

export interface TierDef {
  value: MembershipTier;
  label: string;
  rank: number;
  color: string;
  blurb: string;
}

export const TIERS: TierDef[] = [
  {
    value: 'TIER1_BASIC',
    label: 'Basic',
    rank: 1,
    color: '#2D9B94',
    blurb: 'Free. Browse, read, join debates, report safety signals and use the marketplace.',
  },
  {
    value: 'TIER2_PROFESSIONAL',
    label: 'Professional',
    rank: 2,
    color: '#F59E0B',
    blurb: 'Verified professionals. Post innovations, direct messaging, Practitioners Hub, investment tools.',
  },
  {
    value: 'TIER3_EXPERT',
    label: 'Expert',
    rank: 3,
    color: '#8B7FD4',
    blurb: 'Peer-vouched leaders. Priority visibility, CME/CPD, full deal room and peer review.',
  },
];

const TIER_RANK: Record<MembershipTier, number> = {
  TIER1_BASIC: 1,
  TIER2_PROFESSIONAL: 2,
  TIER3_EXPERT: 3,
};

export function tierLabel(tier?: string | null): string {
  const def = TIERS.find((t) => t.value === tier);
  return def?.label ?? 'Basic';
}

export function tierRank(tier?: string | null): number {
  if (!tier) return 1;
  return TIER_RANK[tier as MembershipTier] ?? 1;
}

/** True when the user's tier meets or exceeds the required tier. */
export function hasTier(userTier: string | null | undefined, required: MembershipTier): boolean {
  return tierRank(userTier) >= tierRank(required);
}

/**
 * Whether full physical-address details are mandatory for a user.
 * Basic (free) members are exempt; Professional and Expert members must provide
 * their physical address, city, postal code and country of origin.
 */
export function addressRequiredForTier(tier?: string | null): boolean {
  return hasTier(tier, 'TIER2_PROFESSIONAL');
}

// ---------------------------------------------------------------------------
// Multi-role helpers — a user may hold one primary role + additional roles.
// ---------------------------------------------------------------------------

/** All roles this user can access (primary + additional, deduplicated). */
export function userRoles(primaryRole?: string | null, additionalRoles?: string[]): string[] {
  const set = new Set<string>();
  if (primaryRole) set.add(primaryRole);
  if (additionalRoles) additionalRoles.forEach(r => set.add(r));
  return Array.from(set);
}

/** Check whether a user may access a surface that requires `requiredRole`. */
export function hasRole(primaryRole?: string | null, additionalRoles?: string[], requiredRole?: string): boolean {
  if (!requiredRole) return true;
  if (primaryRole === 'ADMIN') return true; // admin can access everything
  const roles = userRoles(primaryRole, additionalRoles);
  return roles.includes(requiredRole);
}

// Post-login routing — every role has a home surface.
// ---------------------------------------------------------------------------

export function homePathForRole(role?: string | null): string {
  if (role === 'MEMBER') return '/talent';
  if (role === 'STAFF') return '/dashboard/practice';
  switch (role) {
    case 'INVESTOR':
      return '/investor';
    case 'INNOVATOR':
      return '/innovator';
    case 'EMPLOYER':
      return '/employer';
    case 'POLICYMAKER':
      return '/policymaker';
    case 'ADMIN':
      return '/admin';
    // PRACTITIONER, PATIENT and any legacy roles use the dashboard.
    default:
      return '/dashboard';
  }
}
