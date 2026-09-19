import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertTalent,
  cleanOwnedAsset,
  hasRecruiterDiscovery,
  talentActor,
  talentTransaction,
  enrollTalent,
  type TalentDb,
} from "@/lib/talent-access";
import { profileSchema } from "@/lib/talent-validation";

const gpsSelection = {
  id: true,
  title: true,
  organization: true,
  entryType: true,
  healthArea: true,
  geography: true,
  periodStart: true,
  periodEnd: true,
  gap: true,
  solution: true,
  outcome: true,
  _count: { select: { endorsements: true } },
} as const;
export async function sharedGps(
  userId: string,
  ids: string[],
  db: TalentDb = prisma,
) {
  const entries = await db.gpsEntry.findMany({
    where: { userId, id: { in: ids } },
    select: gpsSelection,
    orderBy: { createdAt: "desc" },
  });
  assertTalent(
    entries.length === new Set(ids).size,
    400,
    "Only your own existing GPS entries can be shared",
  );
  return entries;
}
export async function saveTalentProfile(userId: string, input: unknown) {
  const parsed = profileSchema.parse(input);
  return talentTransaction(async (db) => {
    await talentActor(userId, db);
    await enrollTalent(userId, db);
    await sharedGps(userId, parsed.sharedGpsIds, db);
    await cleanOwnedAsset(userId, parsed.avatarAssetId, ["PROFILE_IMAGE"], db);
    await cleanOwnedAsset(
      userId,
      parsed.savedResumeAssetId,
      ["TALENT_RESUME"],
      db,
      true,
    );
    const { adultConfirmed, ...data } = parsed;
    return db.talentProfile.upsert({
      where: { userId },
      create: { ...data, userId, adultConfirmedAt: new Date() },
      update: data,
    });
  });
}
export async function careerSnapshot(
  userId: string,
  gpsIds: string[],
  db: TalentDb = prisma,
  validateSelection = true,
) {
  const profile = await db.talentProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          name: true,
          paxId: true,
          credibilityScore: true,
          verificationLevel: true,
        },
      },
    },
  });
  assertTalent(profile, 400, "Complete your Talent profile before applying");
  return {
    name: profile.user.name,
    paxId: profile.user.paxId,
    headline: profile.headline,
    about: profile.about,
    location: profile.location,
    country: profile.country,
    specialty: profile.specialty,
    skills: profile.skills,
    languages: profile.languages,
    experiences: profile.experiences,
    education: profile.education,
    credentials: profile.credentials,
    yearsExperience: profile.yearsExperience,
    availability: profile.availability,
    credibilityScore: profile.user.credibilityScore,
    verificationLevel: profile.user.verificationLevel,
    gps: validateSelection
      ? await sharedGps(userId, gpsIds, db)
      : await db.gpsEntry.findMany({
          where: { userId, id: { in: gpsIds } },
          select: gpsSelection,
          orderBy: { createdAt: "desc" },
        }),
  };
}
export async function viewTalentProfile(
  targetId: string,
  viewerId?: string,
  preview?: string,
) {
  const profile = await prisma.talentProfile.findUnique({
    where: { userId: targetId },
    include: { user: { select: { accountStatus: true } } },
  });
  assertTalent(
    profile?.user.accountStatus === "ACTIVE",
    404,
    "Profile not found",
  );
  const isOwner = targetId === viewerId;
  const allowed =
    isOwner ||
    profile.visibility === "PUBLIC" ||
    (profile.visibility === "RECRUITERS" &&
      viewerId &&
      (await hasRecruiterDiscovery(viewerId)));
  assertTalent(allowed, 404, "Profile not found");
  const snapshot = await careerSnapshot(
    targetId,
    profile.sharedGpsIds,
    prisma,
    false,
  );
  return {
    ...snapshot,
    userId: targetId,
    visibility: profile.visibility,
    avatarAssetId: profile.avatarAssetId,
    ...(isOwner && !preview
      ? { settings: { ...profile, user: undefined } }
      : {}),
  };
}
export async function searchTalentProfiles(
  viewerId: string | undefined,
  q = "",
  page = 1,
) {
  const recruiter = viewerId ? await hasRecruiterDiscovery(viewerId) : false;
  const where: Prisma.TalentProfileWhereInput = {
    visibility: { in: recruiter ? ["PUBLIC", "RECRUITERS"] : ["PUBLIC"] },
    user: { accountStatus: "ACTIVE" },
    ...(q
      ? {
          OR: [
            { headline: { contains: q, mode: "insensitive" } },
            { specialty: { contains: q, mode: "insensitive" } },
            {
              user: {
                name: { contains: q, mode: "insensitive" },
                accountStatus: "ACTIVE",
              },
            },
            { skills: { has: q } },
          ],
        }
      : {}),
  };
  const profiles = await prisma.talentProfile.findMany({
    where,
    skip: (page - 1) * 20,
    take: 21,
    orderBy: [{ updatedAt: "desc" }, { userId: "asc" }],
    select: {
      userId: true,
      headline: true,
      location: true,
      specialty: true,
      skills: true,
      user: { select: { name: true, credibilityScore: true } },
    },
  });
  return { results: profiles.slice(0, 20), hasMore: profiles.length > 20 };
}
