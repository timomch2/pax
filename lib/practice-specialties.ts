import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorizeUser } from "@/lib/authorization";
import { assertPractice } from "@/lib/practice-policy";
import { practiceTransaction } from "@/lib/practice-db";
import { hasRole } from "@/lib/access";

export const specialtyProposalSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    parentId: z.string().min(1).max(100),
  })
  .strict();
export const normalizeSpecialty = (name: string) =>
  name.trim().replace(/\s+/g, " ").toLowerCase();

/** Only approved taxonomy enters shared selection lists. A member's suggestions remain private until review. */
export async function listPracticeSpecialties(actorId?: string) {
  return prisma.practiceSpecialty.findMany({
    where: {
      OR: [
        { status: "APPROVED" },
        ...(actorId ? [{ proposedById: actorId, status: "PENDING" }] : []),
      ],
    },
    select: { id: true, name: true, parentId: true, status: true },
    orderBy: { name: "asc" },
  });
}

/** Proposing a specialty grants neither verification nor clinical access. */
export async function proposePracticeSpecialty(actorId: string, raw: unknown) {
  const body = specialtyProposalSchema.parse(raw);
  const access = await authorizeUser(actorId, "profile.update");
  assertPractice(
    access.ok,
    access.ok ? 200 : access.status,
    access.ok ? "" : access.error,
  );
  return practiceTransaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { role: true, additionalRoles: true },
    });
    assertPractice(
      actor && hasRole(actor.role, actor.additionalRoles, "PRACTITIONER"),
      403,
      "A practitioner account is required",
    );
    assertPractice(
      await tx.practitionerProfile.findUnique({ where: { userId: actorId } }),
      403,
      "A practitioner profile is required",
    );
    const parent = await tx.practiceSpecialty.findFirst({
      where: { id: body.parentId, parentId: null, status: "APPROVED" },
    });
    assertPractice(parent, 400, "Select an approved specialty group");
    const normalizedName = `${parent.id}:${normalizeSpecialty(body.name)}`;
    const existing = await tx.practiceSpecialty.findUnique({
      where: { normalizedName },
    });
    assertPractice(
      !existing ||
        existing.status === "APPROVED" ||
        existing.proposedById === actorId,
      409,
      "This suggestion is already under review",
    );
    const specialty =
      existing ??
      (await tx.practiceSpecialty.create({
        data: { ...body, normalizedName, proposedById: actorId },
      }));
    assertPractice(
      specialty.status !== "REJECTED",
      409,
      "This suggestion was declined. Choose another specialty or contact support.",
    );
    await tx.practitionerProfile.update({
      where: { userId: actorId },
      data: {
        specialtyId: specialty.status === "APPROVED" ? specialty.id : null,
        specialtyGroupId: parent.id,
        specialtyOther: specialty.status === "PENDING" ? specialty.name : null,
        specialty: specialty.name,
      },
    });
    return specialty;
  });
}

/** Review is explicit and permission-gated; rejection preserves the practitioner's free-text description. */
export async function reviewPracticeSpecialty(actorId: string, raw: unknown) {
  const access = await authorizeUser(actorId, "verification.review");
  assertPractice(
    access.ok,
    access.ok ? 200 : access.status,
    access.ok ? "" : access.error,
  );
  const body = z
    .object({
      id: z.string().min(1).max(100),
      status: z.enum(["APPROVED", "REJECTED"]),
      notes: z.string().trim().min(5).max(2000),
    })
    .strict()
    .parse(raw);
  return practiceTransaction(async (tx) => {
    const row = await tx.practiceSpecialty.findUnique({
      where: { id: body.id },
    });
    assertPractice(
      row?.status === "PENDING",
      409,
      "This suggestion has already been reviewed",
    );
    const reviewed = await tx.practiceSpecialty.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: {
        status: body.status,
        reviewedById: actorId,
        reviewNotes: body.notes,
      },
    });
    assertPractice(
      reviewed.count === 1,
      409,
      "This suggestion has already been reviewed",
    );
    if (body.status === "APPROVED" && row.proposedById)
      await tx.practitionerProfile.updateMany({
        where: {
          userId: row.proposedById,
          specialtyGroupId: row.parentId,
          specialtyOther: row.name,
        },
        data: { specialtyId: row.id, specialtyOther: null },
      });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "PRACTICE_SPECIALTY_REVIEW",
        entityType: "PracticeSpecialty",
        entityId: row.id,
        context: JSON.stringify({ status: body.status, notes: body.notes }),
      },
    });
    return { ok: true };
  });
}
