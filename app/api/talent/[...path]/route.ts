export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { dispatchTalent } from "@/lib/talent-api";
import { TalentError, assertTalent } from "@/lib/talent-access";
import { talentEnabled, isSameProductOrigin } from "@/lib/product-hosts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

async function handle(
  request: Request,
  { params }: { params: { path: string[] } },
) {
  try {
    assertTalent(talentEnabled(), 404, "Talent is not available");
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const mutation = request.method !== "GET";
    let body: unknown;
    if (mutation) {
      assertTalent(userId, 401, "Unauthorized");
      assertTalent(isSameProductOrigin(request), 403, "Invalid request origin");
      const limited = await enforceRateLimit(
        request,
        { name: "talent-write", limit: 100, windowSeconds: 60 },
        userId,
      );
      assertTalent(
        limited.allowed,
        429,
        "Too many requests; please try again shortly",
      );
      const raw = await request.text();
      assertTalent(raw.length <= 1000000, 413, "Request is too large");
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        throw new TalentError(400, "Invalid JSON");
      }
    }
    const result = await dispatchTalent(
      request.method,
      params.path,
      new URL(request.url),
      userId,
      body,
    );
    if (mutation)
      await logAudit({
        userId,
        action: `TALENT_${request.method}`,
        entityType: params.path[0],
        entityId: params.path[1],
        outcome: "SUCCESS",
        request,
      });
    if (result && "redirect" in result && typeof result.redirect === "string")
      return NextResponse.redirect(result.redirect, {
        headers: { "Cache-Control": "private, no-store" },
      });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof TalentError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          error: error.issues.map((issue) => issue.message).join("; "),
          issues: error.flatten(),
        },
        { status: 400 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    )
      return NextResponse.json(
        {
          error: "This record changed or already exists. Reload and try again.",
        },
        { status: 409 },
      );
    console.error(
      "Talent request failed",
      error instanceof Error ? error.name : "Unknown error",
    );
    return NextResponse.json(
      { error: "Unable to complete this request" },
      { status: 500 },
    );
  }
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
