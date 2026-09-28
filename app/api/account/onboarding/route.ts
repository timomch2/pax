import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { accountDetailsSchema } from "@/lib/registration";
import { isSameProductOrigin } from "@/lib/product-hosts";
import { completeAccountOnboarding } from "@/lib/account-onboarding";
import { enforceRateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameProductOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  const limit = await enforceRateLimit(
    request,
    { name: "account-onboarding", limit: 15, windowSeconds: 3600 },
    session.user.id,
  );
  if (!limit.allowed)
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = accountDetailsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  try {
    const result = await completeAccountOnboarding(
      session.user.id,
      parsed.data,
      request,
    );
    return NextResponse.json(
      result === 200
        ? { ok: true }
        : { error: "A verified active account is required" },
      { status: result },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not complete your account. Please try again." },
      { status: 500 },
    );
  }
}
