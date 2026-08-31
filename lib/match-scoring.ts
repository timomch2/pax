// PAX Neural Matchmaking Pipeline — deterministic investor↔innovation compatibility scoring.
//
// Produces a 0–100 % compatibility score plus human-readable reasons, comparing an
// investor's mandate (geography, sector pillar, funding stage, ticket size) against an
// innovation. Empty mandate dimensions are treated as "no preference" (neutral full marks)
// so a partially-filled mandate still yields meaningful scores.
//
// This is intentionally deterministic (no external API dependency) so scoring is fast,
// reproducible and always available. An optional qualitative rationale can be layered on
// top elsewhere via the LLM, but the score itself never depends on it.

export interface MandateLike {
  geographies: string[];
  sectors: string[];
  stages: string[];
  ticketMinUsd: number;
  ticketMaxUsd: number;
}

export interface InnovationLike {
  sector?: string | null;
  stage?: string | null;
  location?: string | null;
  fundingGoal?: number | null;
  verified?: boolean | null;
  credibilityScore?: number | null;
}

export interface MatchResult {
  score: number;          // 0–100
  reasons: string[];      // positive match explanations
  gaps: string[];         // dimensions that did not match
}

// Rough KSh→USD conversion for the (soft) ticket dimension. Funding goals are stored in
// KSh across the app; investor tickets are expressed in USD. This keeps the comparison
// in the right order of magnitude without pretending to be a live FX rate.
export const KSH_PER_USD = 130;

const WEIGHTS = { geography: 25, sector: 30, stage: 25, ticket: 20 };

function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Loose geographic containment: an innovation location "Nairobi, Kenya" should match a
// mandate targeting "East Africa", "Sub-Saharan Africa", "Pan-African" or "Global".
const REGION_KEYWORDS: Record<string, string[]> = {
  'east africa': ['kenya', 'uganda', 'tanzania', 'rwanda', 'ethiopia', 'burundi', 'south sudan', 'somalia', 'nairobi', 'kampala', 'kigali', 'dar es salaam', 'addis'],
  'west africa': ['nigeria', 'ghana', 'senegal', 'ivory coast', "cote d'ivoire", 'mali', 'lagos', 'accra', 'dakar'],
  'southern africa': ['south africa', 'zambia', 'zimbabwe', 'botswana', 'namibia', 'malawi', 'mozambique', 'johannesburg', 'cape town', 'lusaka'],
  'central africa': ['cameroon', 'drc', 'congo', 'gabon', 'chad', 'kinshasa'],
  'north africa': ['egypt', 'morocco', 'tunisia', 'algeria', 'libya', 'cairo', 'casablanca'],
  'middle east': ['uae', 'united arab emirates', 'saudi', 'qatar', 'jordan', 'lebanon', 'oman', 'dubai', 'riyadh'],
  'south asia': ['india', 'pakistan', 'bangladesh', 'nepal', 'sri lanka', 'delhi', 'mumbai', 'dhaka', 'karachi'],
  'southeast asia': ['indonesia', 'philippines', 'vietnam', 'thailand', 'malaysia', 'singapore', 'myanmar', 'jakarta', 'manila', 'bangkok'],
  'east asia & pacific': ['china', 'japan', 'korea', 'australia', 'new zealand', 'papua new guinea', 'fiji', 'tokyo', 'seoul', 'sydney'],
  'latin america & caribbean': ['brazil', 'mexico', 'colombia', 'peru', 'chile', 'argentina', 'haiti', 'jamaica', 'sao paulo', 'bogota', 'lima'],
  'europe': ['united kingdom', 'uk', 'england', 'france', 'germany', 'netherlands', 'spain', 'italy', 'sweden', 'switzerland', 'london', 'paris', 'berlin', 'geneva'],
  'north america': ['united states', 'usa', 'u.s.', 'canada', 'new york', 'boston', 'toronto', 'seattle'],
};

function geographyMatches(mandateGeos: string[], location: string): boolean {
  const loc = norm(location);
  for (const g of mandateGeos) {
    const gn = norm(g);
    if (gn === 'global' || gn === 'pan-african') return true;
    if (loc.includes(gn)) return true;
    if (gn === 'sub-saharan africa') {
      // any sub-Saharan keyword
      const all = Object.entries(REGION_KEYWORDS).filter(([k]) => k !== 'north africa');
      if (all.some(([, kws]) => kws.some((kw) => loc.includes(kw)))) return true;
    }
    const kws = REGION_KEYWORDS[gn];
    if (kws && kws.some((kw) => loc.includes(kw))) return true;
  }
  return false;
}

export function computeMatchScore(mandate: MandateLike, innovation: InnovationLike): MatchResult {
  const reasons: string[] = [];
  const gaps: string[] = [];
  let score = 0;

  // Geography
  if (!mandate.geographies || mandate.geographies.length === 0) {
    score += WEIGHTS.geography; // no preference → neutral full
  } else if (innovation.location && geographyMatches(mandate.geographies, innovation.location)) {
    score += WEIGHTS.geography;
    reasons.push(`Located in your target region (${innovation.location})`);
  } else {
    gaps.push('Outside your target geographies');
  }

  // Sector / pillar
  if (!mandate.sectors || mandate.sectors.length === 0) {
    score += WEIGHTS.sector;
  } else if (innovation.sector && mandate.sectors.map(norm).includes(norm(innovation.sector))) {
    score += WEIGHTS.sector;
    reasons.push(`Matches your focus sector: ${innovation.sector}`);
  } else {
    gaps.push(`Different sector (${innovation.sector ?? 'unspecified'})`);
  }

  // Stage
  if (!mandate.stages || mandate.stages.length === 0) {
    score += WEIGHTS.stage;
  } else if (innovation.stage && mandate.stages.map(norm).includes(norm(innovation.stage))) {
    score += WEIGHTS.stage;
    reasons.push(`At your preferred funding stage`);
  } else {
    gaps.push(`Different stage (${innovation.stage ?? 'unspecified'})`);
  }

  // Ticket size (soft) — compare funding goal (KSh→USD) to mandate range
  const hasTicket = (mandate.ticketMinUsd ?? 0) > 0 || (mandate.ticketMaxUsd ?? 0) > 0;
  if (!hasTicket) {
    score += WEIGHTS.ticket;
  } else {
    const goalUsd = Math.round((innovation.fundingGoal ?? 0) / KSH_PER_USD);
    const min = mandate.ticketMinUsd ?? 0;
    const max = mandate.ticketMaxUsd && mandate.ticketMaxUsd > 0 ? mandate.ticketMaxUsd : Number.MAX_SAFE_INTEGER;
    if (goalUsd === 0) {
      score += Math.round(WEIGHTS.ticket / 2); // unknown goal → half credit
    } else if (goalUsd >= min && goalUsd <= max) {
      score += WEIGHTS.ticket;
      reasons.push('Funding goal fits your ticket range');
    } else {
      // partial credit if within 2x of the range
      const near = goalUsd < min ? goalUsd * 2 >= min : goalUsd <= max * 2;
      if (near) score += Math.round(WEIGHTS.ticket / 2);
      gaps.push('Funding goal outside your ticket range');
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons, gaps };
}

export function matchBand(score: number): { label: string; className: string } {
  if (score >= 80) return { label: 'Strong match', className: 'bg-[#2D9B94]/20 text-[#2ABFB0]' };
  if (score >= 60) return { label: 'Good match', className: 'bg-[#F59E0B]/15 text-[#FBBF24]' };
  if (score >= 40) return { label: 'Partial match', className: 'bg-[#8B7FD4]/20 text-[#b6acef]' };
  return { label: 'Low match', className: 'bg-white/10 text-white/60' };
}

// Threshold above which a new innovation triggers a deal alert to a matching investor.
export const DEAL_ALERT_THRESHOLD = 60;
