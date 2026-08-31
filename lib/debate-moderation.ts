// Server-only AI moderation for the Debate Hub.
// POLICY: AI *flags and drafts* — a human decides. This function NEVER removes
// or hides content. The worst it does is mark a contribution FLAGGED (still
// visible) with a reason for the human moderation queue. If the AI is
// unavailable, the contribution stays fully visible (OK).

type ModerationResult = {
  status: 'OK' | 'FLAGGED';
  reason: string | null;
  categories: string[];
};

const SYSTEM_PROMPT = `You are a content-safety moderator for a professional public-health deliberation platform (PAX Knowledge Exchange). Members are practitioners, community health workers, researchers, innovators and policymakers debating how health policies, studies and innovations work in real settings.

Review a single member contribution and decide whether a HUMAN moderator should review it. You never delete anything — you only flag.

Flag (flag=true) only for genuine concerns in these categories:
- PATIENT_IDENTIFIERS: reveals identifiable patient info (full names, phone numbers, national IDs, clinic record numbers tied to a person).
- UNSAFE_ADVICE: gives specific clinical/treatment instructions presented as medical advice to an individual.
- MISINFORMATION: makes a factual public-health claim that clearly contradicts established evidence.
- ABUSE: personal attacks, harassment, hate.
- SPAM: advertising, irrelevant promotion, gibberish.
- OFF_TOPIC: unrelated to the debate or to public health.
- CONFLICT_OF_INTEREST: undisclosed commercial/financial interest that colours the contribution.

Professional disagreement, criticism of a policy/study/innovation, and describing real field failures are NORMAL and must NOT be flagged. Do not flag robust debate. When in doubt, do not flag.`;

export async function moderateContribution(body: string): Promise<ModerationResult> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) {
    // No key — fail open (visible). Never block or hide on infrastructure gaps.
    return { status: 'OK', reason: null, categories: [] };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        max_tokens: 400,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              `Contribution to review:\n"""\n${body}\n"""\n\n` +
              'Respond with raw JSON only, no markdown:\n' +
              '{"flag": boolean, "categories": ["CATEGORY"], "reason": "one short sentence for the human moderator, or empty if not flagged"}',
          },
        ],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return { status: 'OK', reason: null, categories: [] };
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    const cleaned = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed?.flag) {
      return {
        status: 'FLAGGED',
        reason: typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : 'Flagged for human review.',
        categories: Array.isArray(parsed.categories) ? parsed.categories.map(String) : [],
      };
    }
    return { status: 'OK', reason: null, categories: [] };
  } catch (e) {
    // Timeout / network / parse error — fail open (visible).
    return { status: 'OK', reason: null, categories: [] };
  }
}
