// Tiered weighting model for product / technology feedback.
// The more accountable and evidence-backed a review, the more it moves the score.

export type FeedbackTier = 'STAR' | 'STAR_COMMENT' | 'EXPERT_COMMENT' | 'EXPERT_EVIDENCE';

export interface TierInfo {
  tier: FeedbackTier;
  weight: number;
  label: string;
  description: string;
}

export const TIER_TABLE: Record<FeedbackTier, TierInfo> = {
  STAR: { tier: 'STAR', weight: 1, label: 'Star rating', description: 'A rating with no comment' },
  STAR_COMMENT: { tier: 'STAR_COMMENT', weight: 1.5, label: 'Rating + comment', description: 'A rating backed by a written comment' },
  EXPERT_COMMENT: { tier: 'EXPERT_COMMENT', weight: 3, label: 'Expert comment', description: 'A verified practitioner rating with a comment' },
  EXPERT_EVIDENCE: { tier: 'EXPERT_EVIDENCE', weight: 5, label: 'Expert + evidence', description: 'A verified practitioner review backed by supporting evidence' },
};

export function resolveFeedbackTier(opts: {
  isExpert: boolean;
  hasComment: boolean;
  hasEvidence: boolean;
}): TierInfo {
  const { isExpert, hasComment, hasEvidence } = opts;
  if (isExpert && hasEvidence && hasComment) return TIER_TABLE.EXPERT_EVIDENCE;
  if (isExpert && hasComment) return TIER_TABLE.EXPERT_COMMENT;
  if (hasComment) return TIER_TABLE.STAR_COMMENT;
  return TIER_TABLE.STAR;
}
