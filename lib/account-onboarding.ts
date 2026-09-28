import { prisma } from "@/lib/db";
import { accountDetailsSchema, recordRegistration } from "@/lib/registration";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from "@/lib/policy-version";
/** Complete only the authenticated identity, with consent and preferences in the same transaction. */
export async function completeAccountOnboarding(
  userId: string,
  input: unknown,
  request: Request,
) {
  const { serviceKeys, consentGiven, ...details } =
    accountDetailsSchema.parse(input);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || !user.emailVerified || user.accountStatus !== "ACTIVE")
      return 403;
    if (user.registrationVersion !== 1 || user.accountOnboardingCompletedAt)
      return 200;
    // Conditional update serializes repeated completion requests before enrollment creation.
    const claimed = await tx.user.updateMany({
      where: { id: user.id, accountOnboardingCompletedAt: null },
      data: {
        ...details,
        accountOnboardingCompletedAt: new Date(),
        consentedAt: new Date(),
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        termsVersion: TERMS_VERSION,
      },
    });
    if (!claimed.count) return 200;
    await recordRegistration(tx, user.id, serviceKeys, request);
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "ACCOUNT_ONBOARDING_COMPLETED",
        entityType: "User",
        entityId: user.id,
      },
    });
    return 200;
  });
  return result;
}
