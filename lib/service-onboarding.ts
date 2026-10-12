import { Prisma, ServiceKey } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { productUrl } from "@/lib/product-hosts";
import { ServiceEnrollmentError } from "@/lib/service-enrollment";
import { setupActor, completeServiceSetup } from "@/lib/service-setup";
import {
  createInnovation,
  innovationCreateSchema,
} from "@/lib/innovation-create";
import { investorMandateSchema } from "@/lib/investor-mandate-input";
import {
  communityProfileSchema,
  practiceProfileSchema,
} from "@/lib/service-profile-validation";
import { generateClinicId } from "@/lib/pax-id";
import { IP_PROTECTION_LEVELS } from "@/lib/pax-labels";
import { SERVICE_CATALOG } from "@/lib/service-navigation";
export const serviceSetupRequestSchema = z
  .object({
    action: z.enum(["begin", "complete"]),
    choice: z
      .enum(["career", "hiring", "both", "browse", "buyer", "vendor"])
      .optional(),
    data: z.unknown().optional(),
  })
  .strict();
const practitionerSchema = practiceProfileSchema
  .omit({ specialtyId: true, specialtyGroupId: true, specialtyOther: true, directoryEnabled: true, practiceAddress: true, practiceTown: true, practiceCounty: true, latitude: true, longitude: true })
  .extend({ medicalRegNumber: z.string().trim().min(1).max(120) })
  .strict();

export async function saveServiceSetup(
  userId: string,
  service: ServiceKey,
  raw: unknown,
) {
  const input = serviceSetupRequestSchema.parse(raw);
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const { user, enrollment } = await setupActor(tx, userId, service);
          const definition = SERVICE_CATALOG.find(
            (item) => item.id === service,
          )!;
          const href = productUrl(definition.product, definition.path);
          if (enrollment.setupCompletedAt) return { ok: true, href };
          if (input.action === "begin") {
            if (
              input.choice &&
              !(
                service === "talent"
                  ? ["career", "hiring", "both"]
                  : service === "market"
                    ? ["browse", "buyer", "vendor"]
                    : []
              ).includes(input.choice)
            )
              throw new ServiceEnrollmentError(
                400,
                "Choose an option for this service",
              );
            await tx.userService.update({
              where: { id: enrollment.id },
              data: {
                setupStartedAt: enrollment.setupStartedAt || new Date(),
                ...(input.choice ? { setupChoice: input.choice } : {}),
              },
            });
            await tx.user.update({
              where: { id: user.id },
              data: { accountWelcomePending: false },
            });
            return { ok: true, href };
          }
          let innovation;
          if (service === "practice") {
            const data = practitionerSchema.parse(input.data);
            await tx.practitionerProfile.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                ...data,
                clinicId: generateClinicId(),
              },
              update: data,
            });
          } else if (service === "community") {
            const data = communityProfileSchema.parse(input.data);
            await tx.user.update({ where: { id: user.id }, data });
          } else if (service === "innovation") {
            const data = innovationCreateSchema.parse(input.data);
            const assessment = z
              .object({
                declarationAccepted: z.literal(true),
                leadAuthority: z.enum(["PASS", "ACTION_NEEDED"]),
                ipProtectionLevel: z
                  .string()
                  .refine((value) =>
                    IP_PROTECTION_LEVELS.some((level) => level.key === value),
                  ),
              })
              .passthrough()
              .safeParse(JSON.parse(data.selfAssessmentData || "{}"));
            if (!data.selfAssessmentCompleted || !assessment.success)
              throw new ServiceEnrollmentError(
                400,
                "Complete the innovation self-assessment first",
              );
            innovation = await createInnovation(tx, user.id, data);
          } else if (service === "investment") {
            const { manifestoAccepted, mandate } = z
              .object({
                manifestoAccepted: z.literal(true),
                mandate: investorMandateSchema,
              })
              .strict()
              .parse(input.data);
            await tx.investorMandate.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                ...mandate,
                ethicalManifestoAcceptedAt: new Date(),
              },
              update: { ...mandate, ethicalManifestoAcceptedAt: new Date() },
            });
          } else if (service === "talent") {
            const profile = await tx.talentProfile.findUnique({
              where: { userId: user.id },
            });
            const hiring = await tx.talentHiringProfile.count({
              where: { ownerId: user.id },
            });
            if (
              !enrollment.setupChoice ||
              ((enrollment.setupChoice === "career" ||
                enrollment.setupChoice === "both") &&
                !profile) ||
              ((enrollment.setupChoice === "hiring" ||
                enrollment.setupChoice === "both") &&
                !hiring)
            )
              throw new ServiceEnrollmentError(
                400,
                "Complete your selected Talent profiles first",
              );
          } else if (service === "market") {
            if (
              enrollment.setupChoice === "buyer" &&
              !(await tx.marketplaceBuyer.findUnique({
                where: { userId: user.id },
              }))
            )
              throw new ServiceEnrollmentError(
                400,
                "Complete your buyer application first",
              );
            if (
              enrollment.setupChoice === "vendor" &&
              !(await tx.marketplaceVendor.findUnique({
                where: { userId: user.id },
              }))
            )
              throw new ServiceEnrollmentError(
                400,
                "Complete your vendor application first",
              );
            if (!enrollment.setupChoice)
              throw new ServiceEnrollmentError(
                400,
                "Choose how you want to use the marketplace",
              );
          }
          await completeServiceSetup(tx, user.id, service);
          return { ok: true, href, ...(innovation ? { innovation } : {}) };
        },
        { isolationLevel: "Serializable" },
      );
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
}
