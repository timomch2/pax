// Server-only AI moderation for Marketplace listings.
// POLICY (identical to Debate Hub): AI *flags* — a human admin decides. This
// NEVER unpublishes or hides a listing. The worst it does is mark the listing
// FLAGGED (still visible/published) with a reason for the admin queue. If the
// AI is unavailable, the listing is treated as OK (fail open).

type ListingModerationResult = {
  status: 'OK' | 'FLAGGED';
  reason: string | null;
  categories: string[];
};

const SYSTEM_PROMPT = `You are a content-safety and compliance moderator for PAX, a B2B/institutional public-health marketplace that operates strictly as a PASSIVE INTERMEDIARY. Vendors list digital health tools & IP, health-security analytics, laboratory & radiological hardware (B2B only), and pharmacy directory profiles.

Review a single vendor listing (title + description) and decide whether a HUMAN admin should review it. You never unpublish anything — you only flag.

Flag (flag=true) only for genuine concerns in these categories:
- DIRECT_DRUG_SALES: attempts to sell prescription pharmaceuticals directly to consumers (PAX forbids this — pharmacy is directory/link-out only).
- B2C_TEST_KITS: offers test kits or lab consumables direct-to-consumer (these are B2B-only).
- UNSUBSTANTIATED_CLAIMS: makes medical efficacy or diagnostic-accuracy claims presented as fact without evidence, or miracle-cure language.
- COUNTERFEIT_OR_UNLICENSED: signals counterfeit, grey-market, or unlicensed medical devices/equipment.
- PROHIBITED_GOODS: narcotics, human tissue/organs, weapons, or other illegal items.
- MISLEADING: bait-and-switch pricing, fake certifications, or impersonation of a regulator (FDA/WHO/CE) as an endorsement.
- SPAM: gibberish, irrelevant promotion, or non-health content.

Legitimate B2B equipment, software, services, and directory profiles are NORMAL and must NOT be flagged. Do not flag ordinary commercial listings. When in doubt, do not flag.`;

export async function moderateListing(title: string, description: string): Promise<ListingModerationResult> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) return { status: 'OK', reason: null, categories: [] };
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
              `Listing to review:\nTitle: ${title}\nDescription:\n"""\n${description}\n"""\n\n` +
              'Respond with raw JSON only, no markdown:\n' +
              '{"flag": boolean, "categories": ["CATEGORY"], "reason": "one short sentence for the human admin, or empty if not flagged"}',
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
    return { status: 'OK', reason: null, categories: [] };
  }
}
