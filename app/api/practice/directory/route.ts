import { practiceResponse } from "@/lib/practice-http";
import { assertPractice } from "@/lib/practice-policy";
import { enforceRateLimit } from "@/lib/rate-limit";
import { findPractitioners } from "@/lib/practice-discovery";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return practiceResponse(async () => {
    assertPractice(
      (
        await enforceRateLimit(request, {
          name: "practice-directory",
          limit: 120,
          windowSeconds: 3600,
        })
      ).allowed,
      429,
      "Too many searches. Try again later.",
    );
    return findPractitioners(
      Object.fromEntries(new URL(request.url).searchParams),
    );
  });
}
