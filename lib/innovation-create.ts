import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { generateIpHash } from "@/lib/ip-timestamp";
import { enqueueInAppNotification } from "@/lib/notification-service";
const optionalText = z.string().trim().max(50000).nullish();
export const innovationCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    sector: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(10000),
    stage: z.enum(["IDEA", "PROTOTYPE", "PILOT", "SCALING"]).default("IDEA"),
    tagline: optionalText,
    problem: optionalText,
    solution: optionalText,
    evidence: optionalText,
    team: optionalText,
    fundingUse: optionalText,
    location: optionalText,
    fundingGoal: z.coerce.number().int().min(0).max(2147483647).default(0),
    submit: z.boolean().default(false),
    selfAssessmentData: z.string().max(30000).nullish(),
    selfAssessmentCompleted: z.boolean().default(false),
    ipProtectionLevel: optionalText,
    patentRegNumber: optionalText,
    patentJurisdiction: optionalText,
    openSourceLicense: optionalText,
    priorDisclosure: z.boolean().default(false),
    priorDisclosureDate: z
      .string()
      .refine(
        (v) => !v || Number.isFinite(Date.parse(v)),
        "Invalid disclosure date",
      )
      .nullish(),
    thirdPartyDeps: z.boolean().default(false),
    thirdPartyDepsNote: optionalText,
    revenueModel: optionalText,
    impactStatement: optionalText,
    technicalBlueprint: optionalText,
    financialModelDetail: optionalText,
    patentDocumentation: optionalText,
    clinicalData: optionalText,
  })
  .strict()
  .refine(
    (v) => !v.submit || Boolean(v.problem?.trim() && v.solution?.trim()),
    "Problem and solution are required before submitting",
  );
export async function createInnovation(
  tx: Prisma.TransactionClient,
  userId: string,
  input: unknown,
) {
  const { submit, priorDisclosureDate, ...values } =
    innovationCreateSchema.parse(input);
  const timestamp = submit ? new Date() : null;
  const innovation = await tx.innovation.create({
    data: {
      ...values,
      ownerId: userId,
      status: submit ? "SUBMITTED" : "DRAFT",
      priorDisclosureDate: priorDisclosureDate
        ? new Date(priorDisclosureDate)
        : null,
      ipTimestampedAt: timestamp,
      submittedAt: timestamp,
      declarationSignedAt: timestamp,
      ipHash: timestamp
        ? generateIpHash({
            ownerId: userId,
            title: values.title,
            problem: values.problem || "",
            solution: values.solution || "",
            evidence: values.evidence || "",
            timestamp: timestamp.toISOString(),
          })
        : null,
    },
  });
  if (submit)
    await enqueueInAppNotification(tx, {
      userId,
      templateSlug: "innovation.submitted",
      variables: { innovationTitle: innovation.title },
      idempotencyKey: `innovation-submitted:${innovation.id}`,
    });
  return innovation;
}
