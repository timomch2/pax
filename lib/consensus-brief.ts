// Server-only — generates a Consensus Intelligence Brief draft via LLM.
// The brief is AI-drafted; a human admin reviews and approves before publishing.

interface BriefInput {
  title: string;
  motion: string;
  type: string;
  healthDomain: string | null;
  geographyFocus: string | null;
  problemStatement: string;
  anchorReference: string | null;
  standardRecommendation: string | null;
  contributions: {
    body: string;
    dimension: string | null;
    feasibilityScore: number | null;
    implementationSetting: string | null;
    isExpert: boolean;
    isDevilsAdvocate: boolean;
    authorRole: string;
  }[];
  stanceDistribution: Record<string, number>;
  feasibilityAvg: number | null;
  communityScore: number;
}

export async function generateConsensusBrief(input: BriefInput): Promise<string> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) throw new Error('LLM API key not configured');

  const contribSummaries = input.contributions.map((c, i) => {
    const tags: string[] = [];
    if (c.isExpert) tags.push('[EXPERT]');
    if (c.isDevilsAdvocate) tags.push('[DEVILS_ADVOCATE]');
    if (c.dimension) tags.push(`[${c.dimension}]`);
    if (c.feasibilityScore) tags.push(`Feasibility: ${c.feasibilityScore}/5`);
    if (c.implementationSetting) tags.push(`Setting: ${c.implementationSetting}`);
    return `Contribution ${i + 1} ${tags.join(' ')} (${c.authorRole}):\n${c.body}`;
  }).join('\n\n');

  const stances = Object.entries(input.stanceDistribution)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const prompt = `You are a senior public health analyst writing a PAX Consensus Intelligence Brief for the debate below. This brief must be citable, evidence-grounded, and practitioner-readable.

DEBATE: ${input.title}
TYPE: ${input.type}
MOTION: ${input.motion}
HEALTH DOMAIN: ${input.healthDomain || 'General'}
GEOGRAPHY: ${input.geographyFocus || 'Global'}
ANCHOR: ${input.anchorReference || 'N/A'}
STANDARD RECOMMENDATION: ${input.standardRecommendation || 'N/A'}
PROBLEM STATEMENT: ${input.problemStatement}

COMMUNITY REACTIONS: ${stances}
AVERAGE FEASIBILITY SCORE: ${input.feasibilityAvg?.toFixed(1) ?? 'N/A'}/5
COMMUNITY SCORE: ${input.communityScore}/100

CONTRIBUTIONS (${input.contributions.length} total):
${contribSummaries}

---

Write a structured Consensus Intelligence Brief using this exact format (in Markdown):

# [Brief Title]

## Executive Summary
A concise 3-4 sentence summary of the consensus finding.

## Background & Policy Context
The policy/study/innovation under review and why it matters.

## Key Findings
### Finding 1: [Theme]
Summarise the evidence from contributions.
### Finding 2: [Theme]
...
(Extract 3-5 key findings from recurring themes in the contributions)

## Feasibility Assessment
Synthesise the feasibility ratings and implementation barriers cited.

## Areas of Consensus
Where contributors broadly agreed.

## Areas of Divergence
Where significant disagreement or uncertainty remains.

## Devil's Advocate Challenges
Key challenges raised by the designated devil's advocate(s), if any.

## Recommendations
Actionable recommendations grounded in the field evidence above. Number them 1-5.

## Limitations
Note the sample size and any bias or gaps.

---
*This brief was synthesised from ${input.contributions.length} practitioner contributions on The Praxis Exchange. It reflects community-validated qualitative evidence and has been reviewed by a human editor.*

Be specific, reference implementation settings mentioned, and do not invent data not present in the contributions. Write in professional but accessible English.`;

  const res = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'You are a senior public health policy analyst. Write clear, evidence-grounded synthesis briefs.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from LLM');
  return content.trim();
}

// Thematic analysis — extract key themes from contributions
export async function extractThemes(contributions: { body: string; dimension: string | null }[]): Promise<string[]> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey || contributions.length === 0) return [];

  const bodies = contributions.map((c, i) => `${i + 1}. ${c.body.slice(0, 300)}`).join('\n');

  try {
    const res = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        max_tokens: 300,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You extract recurring themes from public-health debate contributions. Return a JSON object with a "themes" array of 3-7 short theme labels (2-5 words each). Example: {"themes": ["Cold chain gaps", "Staffing shortages", "Policy-practice disconnect"]}' },
          { role: 'user', content: `Extract the key recurring themes from these ${contributions.length} contributions:\n${bodies}` },
        ],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    const cleaned = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed?.themes) ? parsed.themes.map(String).slice(0, 7) : [];
  } catch {
    return [];
  }
}
