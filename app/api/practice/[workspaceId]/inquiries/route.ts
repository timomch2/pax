import { prisma } from "@/lib/db";
import { requirePractice } from "@/lib/authorization";
import { isSameProductOrigin } from "@/lib/product-hosts";
import { assertPractice } from "@/lib/practice-policy";
import { practiceResponse } from "@/lib/practice-http";
import { reviewAppointmentInquiry } from "@/lib/practice-discovery";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: { workspaceId: string } },
) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, "calendar.read");
    return prisma.practiceAppointmentInquiry.findMany({
      where: { workspaceId: auth.workspaceId, status: "PENDING" },
      select: {
        id: true,
        version: true,
        name: true,
        email: true,
        phone: true,
        preferredDate: true,
        reason: true,
        clientCode: true,
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  });
}
export async function PATCH(
  request: Request,
  { params }: { params: { workspaceId: string } },
) {
  return practiceResponse(async () => {
    const auth = await requirePractice(params.workspaceId, "booking.manage");
    assertPractice(isSameProductOrigin(request), 403, "Invalid request origin");
    return reviewAppointmentInquiry(
      auth.actorId,
      auth.workspaceId,
      await request.json(),
    );
  });
}
