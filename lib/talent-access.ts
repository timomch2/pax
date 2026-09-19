import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/access";
import { authorizeUser } from "@/lib/authorization";
import { talentEnabled } from "@/lib/product-hosts";

export type TalentDb = Prisma.TransactionClient;
export class TalentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertTalent(
  condition: unknown,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new TalentError(status, message);
}
export async function talentActor(userId: string, db: TalentDb = prisma) {
  assertTalent(talentEnabled(), 404, "Talent is not available");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      additionalRoles: true,
      accountStatus: true,
      emailVerified: true,
      image: true,
      paxId: true,
      credibilityScore: true,
      verificationLevel: true,
    },
  });
  assertTalent(
    user && user.accountStatus === "ACTIVE" && user.emailVerified,
    403,
    "A verified active account is required",
  );
  return user;
}
export async function enrollTalent(userId: string, db: TalentDb) {
  const role = await db.accessRole.findUnique({ where: { key: "MEMBER" } });
  assertTalent(
    role?.active,
    503,
    "Talent onboarding is temporarily unavailable",
  );
  await db.userAccessRole.upsert({
    where: { userId_accessRoleId: { userId, accessRoleId: role.id } },
    create: { userId, accessRoleId: role.id, scope: "OWN" },
    update: {},
  });
}
export async function talentAdmin(userId: string) {
  const user = await talentActor(userId);
  assertTalent(
    hasRole(user.role, user.additionalRoles, "ADMIN") &&
      (await authorizeUser(user.id, "admin.system.manage")).ok,
    403,
    "Administrator access is required",
  );
  return user;
}
export async function hiringAccess(
  userId: string,
  id: string,
  action: "read" | "manage" | "create_job" | "owner" = "read",
  db: TalentDb = prisma,
) {
  await talentActor(userId, db);
  const profile = await db.talentHiringProfile.findUnique({
    where: { id },
    include: {
      owner: { select: { accountStatus: true } },
      members: { where: { userId, revokedAt: null } },
    },
  });
  assertTalent(
    profile && profile.owner.accountStatus === "ACTIVE",
    404,
    "Hiring profile not found",
  );
  const role = profile.ownerId === userId ? "OWNER" : profile.members[0]?.role;
  assertTalent(role, 404, "Hiring profile not found");
  if (action === "owner")
    assertTalent(role === "OWNER", 403, "Only the owner can do this");
  if (action === "manage")
    assertTalent(
      ["OWNER", "ADMIN"].includes(role),
      403,
      "Company administrator access is required",
    );
  if (action === "create_job")
    assertTalent(role !== "REVIEWER", 403, "Recruiter access is required");
  return { profile, role, member: profile.members[0] };
}
export async function jobAccess(
  userId: string,
  jobId: string,
  action: "read" | "write" | "note" = "read",
  db: TalentDb = prisma,
) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  assertTalent(job?.hiringProfileId, 404, "Job not found");
  const access = await hiringAccess(userId, job.hiringProfileId, "read", db);
  if (!["OWNER", "ADMIN"].includes(access.role)) {
    const assignment =
      access.member &&
      (await db.talentJobAssignment.findUnique({
        where: { jobId_memberId: { jobId, memberId: access.member.id } },
      }));
    assertTalent(assignment, 404, "Job not found");
  }
  if (action === "write")
    assertTalent(
      access.role !== "REVIEWER",
      403,
      "Reviewers cannot change recruitment or message candidates",
    );
  assertTalent(
    access.profile.verification !== "SUSPENDED",
    403,
    "Hiring access is suspended",
  );
  return { job, ...access };
}
export async function hasRecruiterDiscovery(
  userId: string,
  db: TalentDb = prisma,
) {
  await talentActor(userId, db);
  return Boolean(
    await db.talentHiringProfile.findFirst({
      where: {
        verification: "VERIFIED",
        owner: { accountStatus: "ACTIVE" },
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                revokedAt: null,
                role: { in: ["ADMIN", "RECRUITER"] },
              },
            },
          },
        ],
      },
      select: { id: true },
    }),
  );
}
export async function talentTransaction<T>(
  fn: (db: TalentDb) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 10000,
      });
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < 3
        )
      )
        throw error;
    }
  }
}
export async function cleanOwnedAsset(
  userId: string,
  id: string | null,
  purposes: string[],
  db: TalentDb = prisma,
  allowPending = false,
) {
  if (!id) return null;
  const asset = await db.uploadAsset.findFirst({
    where: { id, ownerId: userId },
  });
  assertTalent(
    asset &&
      purposes.includes(asset.purpose) &&
      (allowPending
        ? !["REJECTED", "EXPIRED"].includes(asset.status)
        : asset.status === "CLEAN"),
    400,
    "Document is unavailable or has not passed security review",
  );
  if (
    !allowPending &&
    ["TALENT_RESUME", "TALENT_DOCUMENT"].includes(asset.purpose)
  )
    assertTalent(
      asset.contentValidatedAt,
      400,
      "Document content must be validated; upload it again",
    );
  return asset;
}
export const publicJobWhere = (): Prisma.JobWhereInput => ({
  status: "PUBLISHED",
  recruitmentClosedAt: null,
  OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
  hiringProfile: {
    verification: "VERIFIED",
    owner: { accountStatus: "ACTIVE" },
  },
});
