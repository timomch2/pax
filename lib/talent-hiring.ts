import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hiringSchema } from "@/lib/talent-validation";
import {
  assertTalent,
  cleanOwnedAsset,
  hiringAccess,
  talentActor,
  talentAdmin,
  talentTransaction,
  enrollTalent,
} from "@/lib/talent-access";
import { enqueueNotification } from "@/lib/notification-service";
import { productNotificationUrl } from "@/lib/product-hosts";
import { notifyTalent } from "@/lib/talent-notifications";

export const talentTokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function listHiringProfiles(userId: string) {
  await talentActor(userId);
  const profiles = await prisma.talentHiringProfile.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, revokedAt: null } } },
      ],
    },
    include: { members: { where: { userId, revokedAt: null } } },
    orderBy: { createdAt: "desc" },
  });
  return profiles.map((profile) => {
    const myRole =
      profile.ownerId === userId ? "OWNER" : profile.members[0]?.role;
    return {
      ...profile,
      members: undefined,
      myRole,
      ...(["OWNER", "ADMIN"].includes(myRole)
        ? {}
        : {
            verificationAssetIds: [],
            verificationStatement: "",
            verificationNote: null,
          }),
    };
  });
}
export async function saveHiringProfile(
  userId: string,
  input: unknown,
  id?: string,
) {
  const data = hiringSchema.parse(input);
  return talentTransaction(async (db) => {
    await talentActor(userId, db);
    await enrollTalent(userId, db);
    const access = id ? await hiringAccess(userId, id, "manage", db) : null;
    assertTalent(
      !access || access.profile.kind === data.kind,
      400,
      "Hiring profile type cannot change",
    );
    if (!access || access.profile.logoAssetId !== data.logoAssetId)
      await cleanOwnedAsset(userId, data.logoAssetId, ["PROFILE_IMAGE"], db);
    for (const asset of data.verificationAssetIds)
      if (!access?.profile.verificationAssetIds.includes(asset))
        await cleanOwnedAsset(userId, asset, ["VERIFICATION_DOCUMENT"], db);
    if (access) {
      assertTalent(
        access.profile.verification !== "SUSPENDED",
        403,
        "Contact an administrator about this suspension",
      );
      const identityChanged =
        access.profile.name !== data.name ||
        access.profile.website !== data.website;
      const updated = await db.talentHiringProfile.update({
        where: { id },
        data: {
          ...data,
          ...(identityChanged
            ? { verification: "DRAFT", reviewedAt: null }
            : {}),
        },
      });
      if (identityChanged)
        await db.job.updateMany({
          where: { hiringProfileId: id, status: "PUBLISHED" },
          data: { status: "CLOSED" },
        });
      return updated;
    }
    const count = await db.talentHiringProfile.count({
      where: { ownerId: userId },
    });
    assertTalent(count < 10, 400, "You can own up to ten hiring profiles");
    const slug = `${
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "organization"
    }-${randomBytes(4).toString("hex")}`;
    return db.talentHiringProfile.create({
      data: { ...data, ownerId: userId, slug },
    });
  });
}
export async function submitHiringVerification(userId: string, id: string) {
  return talentTransaction(async (db) => {
    const { profile } = await hiringAccess(userId, id, "manage", db);
    assertTalent(
      ["DRAFT", "REJECTED"].includes(profile.verification),
      409,
      "Verification cannot be submitted in this state",
    );
    assertTalent(
      profile.verificationStatement.trim().length >= 30,
      400,
      "Explain your hiring identity and authority to represent this organization",
    );
    if (profile.kind === "ORGANIZATION")
      assertTalent(
        profile.website || profile.verificationAssetIds.length,
        400,
        "Supply an organization website or supporting evidence",
      );
    return db.talentHiringProfile.update({
      where: { id },
      data: { verification: "PENDING" },
    });
  });
}
export async function reviewHiringProfile(
  userId: string,
  id: string,
  input: unknown,
) {
  await talentAdmin(userId);
  const data = z
    .object({
      verification: z.enum(["VERIFIED", "REJECTED", "SUSPENDED"]),
      note: z.string().trim().min(10).max(2000),
    })
    .strict()
    .parse(input);
  return talentTransaction(async (db) => {
    const profile = await db.talentHiringProfile.findUnique({ where: { id } });
    assertTalent(profile, 404, "Hiring profile not found");
    assertTalent(
      profile.ownerId !== userId,
      403,
      "Another administrator must verify your own hiring identity",
    );
    if (data.verification === "VERIFIED")
      assertTalent(
        ["PENDING", "SUSPENDED"].includes(profile.verification),
        409,
        "This profile is not awaiting review",
      );
    const updated = await db.talentHiringProfile.update({
      where: { id },
      data: {
        verification: data.verification,
        verificationNote: data.note,
        reviewedById: userId,
        reviewedAt: new Date(),
      },
    });
    if (data.verification !== "VERIFIED")
      await db.job.updateMany({
        where: { hiringProfileId: id, status: "PUBLISHED" },
        data: { status: "CLOSED" },
      });
    await notifyTalent(db, {
      userId: profile.ownerId,
      summary: "Your hiring identity review has been updated.",
      path: "/talent/hiring",
      type: "hiring",
      resourceId: id,
      key: `review:${id}:${updated.updatedAt.toISOString()}`,
    });
    return updated;
  });
}
export async function inviteTalentMember(
  userId: string,
  id: string,
  input: unknown,
) {
  const data = z
    .object({
      email: z.string().trim().email().toLowerCase(),
      role: z.enum(["ADMIN", "RECRUITER", "REVIEWER"]),
    })
    .strict()
    .parse(input);
  const token = randomBytes(32).toString("hex");
  const invitation = await talentTransaction(async (db) => {
    const { profile } = await hiringAccess(userId, id, "manage", db);
    assertTalent(
      profile.kind === "ORGANIZATION",
      400,
      "Personal hiring profiles do not have teams",
    );
    assertTalent(
      profile.verification !== "SUSPENDED",
      403,
      "Hiring access is suspended",
    );
    assertTalent(
      (await db.talentTeamInvitation.count({
        where: {
          hiringProfileId: id,
          createdAt: { gt: new Date(Date.now() - 86400000) },
        },
      })) < 30,
      429,
      "Daily invitation limit reached",
    );
    await db.talentTeamInvitation.updateMany({
      where: {
        hiringProfileId: id,
        email: data.email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    const created = await db.talentTeamInvitation.create({
      data: {
        ...data,
        hiringProfileId: id,
        tokenHash: talentTokenHash(token),
        invitedById: userId,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    await enqueueNotification(db, {
      templateSlug: "talent.team-invitation",
      recipient: data.email,
      variables: {
        invitationId: created.id,
        invitationUrl: productNotificationUrl(
          "talent",
          `/talent/team-invitation#${token}`,
        ),
      },
      idempotencyKey: `talent:team-invitation:${created.id}`,
    });
    return created;
  });
  return {
    id: invitation.id,
    token,
    email: data.email,
    expiresAt: invitation.expiresAt,
  };
}
export async function acceptTalentInvitation(userId: string, token: string) {
  assertTalent(/^[a-f0-9]{64}$/.test(token), 400, "Invalid invitation");
  return talentTransaction(async (db) => {
    const user = await talentActor(userId, db);
    const invitation = await db.talentTeamInvitation.findUnique({
      where: { tokenHash: talentTokenHash(token) },
      include: { hiringProfile: true },
    });
    assertTalent(
      invitation &&
        !invitation.acceptedAt &&
        !invitation.revokedAt &&
        invitation.expiresAt > new Date(),
      410,
      "Invitation has expired or is no longer available",
    );
    assertTalent(
      invitation.email === user.email.toLowerCase(),
      403,
      "Sign in with the email address that was invited",
    );
    await hiringAccess(
      invitation.invitedById,
      invitation.hiringProfileId,
      "manage",
      db,
    );
    assertTalent(
      invitation.hiringProfile.ownerId !== userId &&
        invitation.hiringProfile.verification !== "SUSPENDED",
      403,
      "Invitation is unavailable",
    );
    await db.talentTeamInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    return db.talentMember.upsert({
      where: {
        hiringProfileId_userId: {
          hiringProfileId: invitation.hiringProfileId,
          userId,
        },
      },
      create: {
        hiringProfileId: invitation.hiringProfileId,
        userId,
        role: invitation.role,
      },
      update: { role: invitation.role, revokedAt: null },
    });
  });
}
export async function manageTalentMember(
  userId: string,
  profileId: string,
  memberId: string,
  input: unknown,
) {
  const data = z
    .object({
      action: z.enum(["REVOKE", "ROLE", "TRANSFER_OWNER"]),
      role: z.enum(["ADMIN", "RECRUITER", "REVIEWER"]).optional(),
    })
    .strict()
    .parse(input);
  return talentTransaction(async (db) => {
    await hiringAccess(
      userId,
      profileId,
      data.action === "TRANSFER_OWNER" ? "owner" : "manage",
      db,
    );
    const member = await db.talentMember.findFirst({
      where: { id: memberId, hiringProfileId: profileId, revokedAt: null },
    });
    assertTalent(member, 404, "Member not found");
    if (data.action === "TRANSFER_OWNER") {
      await talentActor(member.userId, db);
      await db.talentHiringProfile.update({
        where: { id: profileId },
        data: { ownerId: member.userId },
      });
      await db.talentMember.update({
        where: { id: member.id },
        data: { revokedAt: new Date() },
      });
      await db.talentMember.upsert({
        where: {
          hiringProfileId_userId: { hiringProfileId: profileId, userId },
        },
        create: { hiringProfileId: profileId, userId, role: "ADMIN" },
        update: { role: "ADMIN", revokedAt: null },
      });
    } else {
      assertTalent(data.action !== "ROLE" || data.role, 400, "Select a role");
      await db.talentMember.update({
        where: { id: member.id },
        data:
          data.action === "REVOKE"
            ? { revokedAt: new Date() }
            : { role: data.role },
      });
    }
    return { ok: true };
  });
}
