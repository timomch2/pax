import { practiceResponse } from "@/lib/practice-http";
import { assertPractice } from "@/lib/practice-policy";
import { isSameProductOrigin } from "@/lib/product-hosts";
import { enforceRateLimit, enforceIdentifierRateLimit } from "@/lib/rate-limit";
import {
  appointmentInquirySchema,
  submitAppointmentInquiry,
} from "@/lib/practice-discovery";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  { params }: { params: { practitionerId: string } },
) {
  return practiceResponse(async () => {
    assertPractice(isSameProductOrigin(request), 403, "Invalid request origin");
    assertPractice(
      (
        await enforceRateLimit(request, {
          name: "practice-inquiry-ip",
          limit: 10,
          windowSeconds: 3600,
        })
      ).allowed,
      429,
      "Too many requests. Try again later.",
    );
    const body = appointmentInquirySchema.parse(await request.json());
    assertPractice(
      (
        await enforceIdentifierRateLimit(
          { name: "practice-inquiry-phone", limit: 5, windowSeconds: 3600 },
          body.phone,
        )
      ).allowed,
      429,
      "Please wait before submitting another request",
    );
    return submitAppointmentInquiry(params.practitionerId, body);
  }, 201);
}
