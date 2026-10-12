import { requirePermission } from "@/lib/authorization";
import { isSameProductOrigin } from "@/lib/product-hosts";
import { prisma } from "@/lib/db";
import { assertPractice } from "@/lib/practice-policy";
import { practiceResponse } from "@/lib/practice-http";
import { reviewPracticeSpecialty } from "@/lib/practice-specialties";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return practiceResponse(async () => {
    const auth = await requirePermission("verification.review", {}, request);
    assertPractice(
      auth.ok,
      auth.ok ? 200 : auth.status,
      auth.ok ? "" : auth.error,
    );
    return prisma.practiceSpecialty.findMany({
      where: { status: "PENDING" },
      include: { parent: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  });
}
export async function PATCH(request: Request) {
  return practiceResponse(async () => {
    const auth = await requirePermission("verification.review", {}, request);
    assertPractice(
      auth.ok,
      auth.ok ? 200 : auth.status,
      auth.ok ? "" : auth.error,
    );
    assertPractice(isSameProductOrigin(request), 403, "Invalid request origin");
    return reviewPracticeSpecialty(auth.userId, await request.json());
  });
}
