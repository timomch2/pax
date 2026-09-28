import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { strongPasswordSchema } from "@/lib/password-policy";
import { SERVICE_CATALOG } from "@/lib/service-navigation";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from "@/lib/policy-version";

export const registrationServiceKeys = [
  "practice",
  "talent",
  "market",
  "community",
  "innovation",
  "investment",
  "safety",
] as const;
export const SERVICE_DESCRIPTIONS: Record<
  (typeof registrationServiceKeys)[number],
  string
> = {
  practice: "Manage your practice, appointments, patients and finances.",
  talent: "Build a career profile, find opportunities or hire a team.",
  market: "Discover products or register your buyer or vendor business.",
  community: "Join debates and explore knowledge products.",
  innovation: "Develop ideas, document evidence and protect your innovation.",
  investment: "Build an investment mandate and explore opportunities.",
  safety: "Report drug side effects and product concerns.",
};
export const accountDetailsSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(120),
    phone: z
      .string()
      .trim()
      .min(5, "Enter your phone number with country code")
      .max(40),
    country: z.string().trim().min(2, "Enter your country").max(120),
    physicalAddress: z.string().trim().max(1000).default(""),
    city: z.string().trim().max(120).default(""),
    postalCode: z.string().trim().max(40).default(""),
    serviceKeys: z
      .array(z.enum(registrationServiceKeys))
      .min(1, "Choose at least one service")
      .max(7)
      .refine((v) => new Set(v).size === v.length, "Choose each service once"),
    consentGiven: z.literal(true, {
      errorMap: () => ({
        message: "Please accept the privacy policy and account terms",
      }),
    }),
  })
  .strict();
export const signupSchema = accountDetailsSchema
  .extend({
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((v) => v.toLowerCase()),
    password: strongPasswordSchema,
    turnstileToken: z.string().max(2048).nullable().optional(),
  })
  .strict();

export function registrationHints(
  role: string | null,
  service: string | null,
): (typeof registrationServiceKeys)[number][] {
  if (SERVICE_CATALOG.some((item) => item.id === service))
    return [service as (typeof registrationServiceKeys)[number]];
  const map: Record<string, (typeof registrationServiceKeys)[number]> = {
    practitioner: "practice",
    innovator: "innovation",
    investor: "investment",
    employer: "talent",
    policymaker: "community",
    chw: "talent",
    student: "talent",
  };
  return role && map[role.toLowerCase()] ? [map[role.toLowerCase()]] : [];
}

/** Append enrollment and consent within the same transaction as identity creation/completion. */
export async function recordRegistration(
  tx: Prisma.TransactionClient,
  userId: string,
  serviceKeys: (typeof registrationServiceKeys)[number][],
  request: Request,
) {
  for (const serviceKey of serviceKeys) {
    await tx.userService.create({
      data: {
        userId,
        serviceKey,
        source: "SELF",
        events: {
          create: {
            actorId: userId,
            action: "ENABLED",
            reason: "Selected during account registration",
          },
        },
      },
    });
  }
  await tx.consentRecord.createMany({
    data: (["PRIVACY_POLICY", "ACCOUNT_TERMS"] as const).map((consentType) => ({
      userId,
      consentType,
      granted: true,
      policyVersion: PRIVACY_POLICY_VERSION,
      termsVersion: TERMS_VERSION,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    })),
  });
}
