// Shared constants & helpers for the PAX Exchange Community & Debate Hub.
// Pure data only (no server-only imports, no React) so it is safe to import
// from both server routes and client components.

import { tierRank, type MembershipTier } from '@/lib/access';

export type DebateType = 'POLICY_PRACTICE' | 'RESEARCH_FEASIBILITY' | 'INNOVATION_PILOT';
export type DebateStatus =
  | 'PROPOSED'
  | 'UNDER_REVIEW'
  | 'OPEN'
  | 'CLOSING_SOON'
  | 'CLOSED'
  | 'IN_SYNTHESIS'
  | 'PUBLISHED';
export type ContributionKind = 'SHORT_REVIEW' | 'EXPERT_OPINION';
export type StanceType =
  | 'AGREE'
  | 'DISAGREE'
  | 'PARTLY_AGREE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'RELEVANT_MY_SETTING'
  | 'NOT_FEASIBLE_MY_SETTING';
export type ModerationStatus = 'OK' | 'FLAGGED' | 'REMOVED';

export interface DebateTypeDef {
  value: DebateType;
  label: string;
  shortLabel: string;
  tagline: string;
  coreQuestion: string;
  /** tailwind text/border/bg accent */
  accent: string;
  hex: string;
}

export const DEBATE_TYPES: DebateTypeDef[] = [
  {
    value: 'POLICY_PRACTICE',
    label: 'Policy vs Practice',
    shortLabel: 'Policy → Practice',
    tagline: 'How a policy is adapted, delayed or altered across real resource settings.',
    coreQuestion:
      'A policy was designed for one environment — how are you actually implementing it in your facility or county, and what resource gap forced a workaround?',
    accent: 'text-[#2ABFB0] border-[#2ABFB0]/30 bg-[#2ABFB0]/10',
    hex: '#2ABFB0',
  },
  {
    value: 'RESEARCH_FEASIBILITY',
    label: 'Research Feasibility',
    shortLabel: 'Research Review',
    tagline: 'Real-world peer review of a published study or guideline.',
    coreQuestion:
      'A study recommends a protocol — how practical is it to execute in a high-volume, low-resource setting?',
    accent: 'text-[#8B7FD4] border-[#8B7FD4]/30 bg-[#8B7FD4]/10',
    hex: '#8B7FD4',
  },
  {
    value: 'INNOVATION_PILOT',
    label: 'Innovation Pilot Review',
    shortLabel: 'Pilot Review',
    tagline: 'Stress-test a concept and surface field failure points before capital.',
    coreQuestion:
      'Testing or investing in a solution for this problem — what are the unseen field failure points, infrastructure barriers or regulatory hurdles?',
    accent: 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10',
    hex: '#FBBF24',
  },
];

export function debateType(v?: string | null): DebateTypeDef {
  return DEBATE_TYPES.find((t) => t.value === v) ?? DEBATE_TYPES[0];
}

export const DEBATE_STATUS_META: Record<DebateStatus, { label: string; accent: string }> = {
  PROPOSED: { label: 'Proposed', accent: 'text-muted-foreground border-white/10 bg-white/5' },
  UNDER_REVIEW: { label: 'Under Review', accent: 'text-[#FBBF24] border-[#FBBF24]/30 bg-[#FBBF24]/10' },
  OPEN: { label: 'Open', accent: 'text-[#2ABFB0] border-[#2ABFB0]/30 bg-[#2ABFB0]/10' },
  CLOSING_SOON: { label: 'Closing Soon', accent: 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10' },
  CLOSED: { label: 'Closed', accent: 'text-muted-foreground border-white/10 bg-white/5' },
  IN_SYNTHESIS: { label: 'In Synthesis', accent: 'text-[#8B7FD4] border-[#8B7FD4]/30 bg-[#8B7FD4]/10' },
  PUBLISHED: { label: 'Published', accent: 'text-[#2ABFB0] border-[#2ABFB0]/40 bg-[#2ABFB0]/15' },
};

// The six evaluation dimensions every contribution can be tagged against.
export const DIMENSIONS = [
  'Effectiveness',
  'Equity',
  'Feasibility',
  'Ethics',
  'Scalability',
  'Sustainability',
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const STANCE_META: Record<StanceType, { label: string; tone: 'pos' | 'neg' | 'neutral' }> = {
  AGREE: { label: 'Agree', tone: 'pos' },
  PARTLY_AGREE: { label: 'Partly agree', tone: 'neutral' },
  RELEVANT_MY_SETTING: { label: 'Relevant to my setting', tone: 'pos' },
  DISAGREE: { label: 'Disagree', tone: 'neg' },
  NOT_FEASIBLE_MY_SETTING: { label: 'Not feasible in my setting', tone: 'neg' },
  INSUFFICIENT_EVIDENCE: { label: 'Not enough evidence', tone: 'neutral' },
};
export const STANCE_ORDER: StanceType[] = [
  'AGREE',
  'PARTLY_AGREE',
  'RELEVANT_MY_SETTING',
  'DISAGREE',
  'NOT_FEASIBLE_MY_SETTING',
  'INSUFFICIENT_EVIDENCE',
];

export const HEALTH_DOMAINS = [
  'Health Security',
  'Universal Health Coverage',
  'Maternal & Child Health',
  'Supply Chain & Logistics',
  'Digital Health',
  'Communicable Disease',
  'Non-Communicable Disease',
  'Health Financing',
  'Community Health',
  'Other',
];

export const GEOGRAPHY_OPTIONS = ['Global', 'Regional (multi-country)', 'Country-specific'];

export const ANCHOR_TYPES = [
  { value: 'policy', label: 'Policy / Guideline' },
  { value: 'paper', label: 'Study / Research Paper' },
  { value: 'innovation', label: 'Innovation / Pilot' },
  { value: 'field-challenge', label: 'Field Challenge / Question' },
];

export const DEFAULT_PROMPTS = {
  groundTruth:
    'Ground truth — how does this issue actually manifest in your setting? What happens in practice, not on paper?',
  adaptation:
    'Adaptation — what workarounds, compromises or local innovations have you or your team implemented?',
  feasibility:
    'Feasibility — rate how practical the official recommendation is in your setting (1 = impractical, 5 = fully practical) and say why.',
};

// ----- Tier gating -----------------------------------------------------------
// Tier 1: read, quick-react, short-review, field observations.
// Tier 2: + initiate debates, structured counter-arguments, link evidence.
// Tier 3: + expert opinions, peer review, synthesis, moderation.

export function canInitiate(tier?: string | null): boolean {
  return tierRank(tier as MembershipTier) >= 2;
}
export function canExpertOpinion(tier?: string | null): boolean {
  return tierRank(tier as MembershipTier) >= 3;
}

export const OPEN_STATUSES: DebateStatus[] = ['OPEN', 'CLOSING_SOON'];
