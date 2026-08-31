// GPS Profile helpers — Gap-Problem-Solution profile system (Talent Marketplace §4.5)

export type GpsEntryType =
  | 'FORMAL_ROLE'
  | 'COMMUNITY_INITIATIVE'
  | 'RESEARCH_POLICY'
  | 'VOLUNTEER'
  | 'TRADITIONAL_KNOWLEDGE';

export type GpsEndorserType =
  | 'SUPERVISOR'
  | 'COMMUNITY_ORG'
  | 'BENEFICIARY'
  | 'EXPERT'
  | 'PEER'
  | 'ACADEMIC';

export const ENTRY_TYPE_LABELS: Record<GpsEntryType, string> = {
  FORMAL_ROLE: 'Formal Role',
  COMMUNITY_INITIATIVE: 'Community Initiative',
  RESEARCH_POLICY: 'Research / Policy',
  VOLUNTEER: 'Volunteer Work',
  TRADITIONAL_KNOWLEDGE: 'Traditional Knowledge',
};

export const ENTRY_TYPE_OPTIONS: { value: GpsEntryType; label: string }[] = (
  Object.keys(ENTRY_TYPE_LABELS) as GpsEntryType[]
).map((value) => ({ value, label: ENTRY_TYPE_LABELS[value] }));

// Endorser types with the confirmation statement + relative weight (Talent Marketplace §4.5.4)
export const ENDORSER_TYPES: Record<
  GpsEndorserType,
  { label: string; confirms: string; weight: number }
> = {
  SUPERVISOR: { label: 'Direct Supervisor', confirms: 'I witnessed this — it happened as described.', weight: 1.0 },
  EXPERT: { label: 'Expert Reviewer', confirms: 'This approach is technically sound and evidence-based.', weight: 1.0 },
  COMMUNITY_ORG: { label: 'Community Organisation', confirms: 'This intervention served our community.', weight: 0.85 },
  BENEFICIARY: { label: 'Beneficiary / Community Member', confirms: 'We experienced this change personally.', weight: 0.6 },
  PEER: { label: 'Peer Professional', confirms: 'I collaborated on this and can independently verify it.', weight: 0.6 },
  ACADEMIC: { label: 'Academic / Researcher', confirms: 'This work is consistent with published evidence.', weight: 0.6 },
};

export const ENDORSER_TYPE_OPTIONS: { value: GpsEndorserType; label: string }[] = (
  Object.keys(ENDORSER_TYPES) as GpsEndorserType[]
).map((value) => ({ value, label: ENDORSER_TYPES[value].label }));

export interface GpsEntryLike {
  gap?: string | null;
  rootCause?: string | null;
  solution?: string | null;
  outcome?: string | null;
  lessonsLearned?: string | null;
  endorsements?: { endorserType: GpsEndorserType }[];
}

// Completeness of a single GPS entry (0-100) based on how many of the six fields are filled.
export function entryCompleteness(e: GpsEntryLike): number {
  const fields = [e.gap, e.rootCause, e.solution, e.outcome, e.lessonsLearned];
  const filled = fields.filter((f) => (f ?? '').trim().length > 0).length;
  // 5 GPS fields + a bonus point for having at least one endorsement
  const endorsed = (e.endorsements?.length ?? 0) > 0 ? 1 : 0;
  return Math.round(((filled + endorsed) / 6) * 100);
}

// Does an outcome look measurable? (contains a number / % — a light heuristic)
export function hasMeasurableOutcome(e: GpsEntryLike): boolean {
  return /\d/.test(e.outcome ?? '');
}

// Live debate activity that feeds the Credibility Score.
export interface DebateStats {
  contributions: number; // accepted (non-removed) contributions authored
  upvotesReceived: number; // total upvotes across those contributions
  expertOpinions: number; // contributions posted as Expert Opinions
}

/**
 * Member Credibility Score (0-100) — Talent Marketplace §4.5.5 + Community &
 * Debate Hub. Blends documented GPS evidence with live debate contributions.
 *
 * When `debateStats` is supplied the debate factor (10%) and platform
 * engagement (10%) are driven by real contribution/upvote data; otherwise the
 * function falls back to an expert-endorsement proxy so legacy callers that
 * pass GPS entries alone keep working.
 */
export function computeCredibilityScore(
  entries: GpsEntryLike[],
  debateStats?: DebateStats,
): number {
  const list = entries ?? [];
  const stats = debateStats ?? { contributions: 0, upvotesReceived: 0, expertOpinions: 0 };
  const hasGps = list.length > 0;
  const hasDebate = stats.contributions > 0 || stats.upvotesReceived > 0;
  if (!hasGps && !hasDebate) return 0;

  const allEndorsements = list.flatMap((e) => e.endorsements ?? []);

  // Community endorsements (25%) — community orgs + beneficiaries
  const communityCount = allEndorsements.filter(
    (en) => en.endorserType === 'COMMUNITY_ORG' || en.endorserType === 'BENEFICIARY',
  ).length;
  const communityScore = Math.min(communityCount / 8, 1) * 25;

  // Peer professional validations (20%) — peers, supervisors, experts
  const peerCount = allEndorsements.filter(
    (en) => en.endorserType === 'PEER' || en.endorserType === 'SUPERVISOR' || en.endorserType === 'EXPERT',
  ).length;
  const peerScore = Math.min(peerCount / 6, 1) * 20;

  // Evidence of documented outcomes (20%) — measurable outcomes across entries
  const measurable = list.filter(hasMeasurableOutcome).length;
  const outcomeScore = hasGps ? Math.min(measurable / list.length, 1) * 20 : 0;

  // Quality and depth of GPS entries (15%) — average completeness
  const qualityScore = hasGps
    ? (list.reduce((s, e) => s + entryCompleteness(e), 0) / list.length / 100) * 15
    : 0;

  // Debate contributions (10%) — REAL data when provided, else expert-endorsement proxy
  let debateScore: number;
  if (debateStats) {
    const c = Math.min(stats.contributions / 5, 1) * 4; // breadth of contribution
    const u = Math.min(stats.upvotesReceived / 10, 1) * 4; // peer recognition
    const e = Math.min(stats.expertOpinions / 3, 1) * 2; // expert-level input
    debateScore = c + u + e;
  } else {
    const expertCount = allEndorsements.filter((en) => en.endorserType === 'EXPERT').length;
    debateScore = Math.min(expertCount / 4, 1) * 10;
  }

  // Platform engagement (10%) — breadth of documented entries + debate activity
  const engagementScore = Math.min((list.length + stats.contributions) / 6, 1) * 10;

  return Math.round(
    communityScore + peerScore + outcomeScore + qualityScore + debateScore + engagementScore,
  );
}

// Shared health-area taxonomy used across GPS entries and Challenge Briefs.
export const HEALTH_AREAS = [
  'Maternal & Child Health', 'Infectious Disease', 'Mental Health', 'Nutrition',
  'WASH', 'Non-Communicable Disease', 'Health Systems', 'Community Health',
  'Sexual & Reproductive Health', 'Health Financing', 'Other',
];
