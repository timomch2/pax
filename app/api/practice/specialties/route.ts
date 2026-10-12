import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSameProductOrigin } from "@/lib/product-hosts";
import { assertPractice } from "@/lib/practice-policy";
import { practiceResponse } from "@/lib/practice-http";
import {
  listPracticeSpecialties,
  proposePracticeSpecialty,
} from "@/lib/practice-specialties";
export const dynamic = "force-dynamic";
export async function GET() {
  return practiceResponse(async () => {
    const session = await getServerSession(authOptions);
    return listPracticeSpecialties(session?.user?.id);
  });
}
export async function POST(request: Request) {
  return practiceResponse(async () => {
    const session = await getServerSession(authOptions);
    assertPractice(session?.user?.id, 401, "Unauthorized");
    assertPractice(isSameProductOrigin(request), 403, "Invalid request origin");
    return proposePracticeSpecialty(session.user.id, await request.json());
  }, 201);
}
