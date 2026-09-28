import { saveServiceSetup } from "@/lib/service-onboarding";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { isSameProductOrigin } from "@/lib/product-hosts";
import { isServiceKey, ServiceEnrollmentError } from "@/lib/service-enrollment";
import { enforceRateLimit } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  { params }: { params: { service: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameProductOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  if (!isServiceKey(params.service))
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  const service = params.service;
  const limited = await enforceRateLimit(
    request,
    { name: "service-setup", limit: 60, windowSeconds: 3600 },
    session.user.id,
  );
  if (!limited.allowed)
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  try {
    const result = await saveServiceSetup(
      session.user.id,
      service,
      await request.json(),
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    if (error instanceof ServiceEnrollmentError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      "[service setup] failed",
      error instanceof Error ? error.name : "Unknown",
    );
    return NextResponse.json(
      { error: "Could not save setup. Please try again." },
      { status: 500 },
    );
  }
}
