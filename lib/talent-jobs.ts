import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertTalent,
  hiringAccess,
  jobAccess,
  publicJobWhere,
  talentActor,
  talentTransaction,
} from "@/lib/talent-access";
import {
  jobSchema,
  matchJob,
  searchSchema,
  type TalentSearch,
} from "@/lib/talent-validation";

export const publicJobSelect = {
  id: true,
  title: true,
  organization: true,
  summary: true,
  responsibilities: true,
  requirements: true,
  healthAreas: true,
  employmentType: true,
  workMode: true,
  location: true,
  country: true,
  salaryMinMinor: true,
  salaryMaxMinor: true,
  salaryCurrency: true,
  salaryPeriod: true,
  status: true,
  closesAt: true,
  publishedAt: true,
  version: true,
  requiredSkills: true,
  desirableSkills: true,
  specialty: true,
  minimumYears: true,
  remoteCountries: true,
  applicationConfig: true,
  hiringProfile: {
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      description: true,
      website: true,
      verification: true,
    },
  },
} satisfies Prisma.JobSelect;
export function jobFilter(filters: TalentSearch): Prisma.JobWhereInput {
  return {
    AND: [
      publicJobWhere(),
      filters.country
        ? {
            OR: [
              { country: filters.country },
              { workMode: "REMOTE", remoteCountries: { has: filters.country } },
              { workMode: "REMOTE", remoteCountries: { isEmpty: true } },
            ],
          }
        : {},
      {
        ...(filters.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: "insensitive" } },
                { summary: { contains: filters.q, mode: "insensitive" } },
                { organization: { contains: filters.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(filters.workMode ? { workMode: filters.workMode } : {}),
        ...(filters.employmentType
          ? { employmentType: filters.employmentType }
          : {}),
        ...(filters.specialty
          ? { specialty: { contains: filters.specialty, mode: "insensitive" } }
          : {}),
        ...(filters.skill ? { requiredSkills: { has: filters.skill } } : {}),
      },
    ],
  };
}
export async function searchTalentJobs(input: unknown, userId?: string) {
  const filters = searchSchema.parse(input);
  const profile = userId
    ? await prisma.talentProfile.findUnique({ where: { userId } })
    : null;
  const where = jobFilter(filters);
  const total = await prisma.job.count({ where });
  // Matching is deterministic over the full filtered set, with a bounded batch and stable tie-breakers.
  if (filters.sort === "MATCH" && profile) {
    const ranked: Array<{ id: string; score: number; date: number }> = [];
    let cursor: string | undefined;
    do {
      const batch = await prisma.job.findMany({
        where,
        take: 200,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: "asc" },
        select: {
          id: true,
          publishedAt: true,
          requiredSkills: true,
          specialty: true,
          country: true,
          remoteCountries: true,
          workMode: true,
          employmentType: true,
          minimumYears: true,
        },
      });
      for (const job of batch)
        ranked.push({
          id: job.id,
          score: matchJob(job, profile).score,
          date: job.publishedAt?.getTime() || 0,
        });
      cursor = batch.length === 200 ? batch.at(-1)!.id : undefined;
    } while (cursor);
    ranked.sort(
      (a, b) =>
        b.score - a.score || b.date - a.date || a.id.localeCompare(b.id),
    );
    const ids = ranked
      .slice((filters.page - 1) * 20, filters.page * 20)
      .map((job) => job.id);
    const jobs = await prisma.job.findMany({
      where: { AND: [where, { id: { in: ids } }] },
      select: publicJobSelect,
    });
    jobs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return {
      jobs: jobs.map((job) => ({ ...job, match: matchJob(job, profile) })),
      total,
      page: filters.page,
    };
  }
  const jobs = await prisma.job.findMany({
    where,
    take: 20,
    skip: (filters.page - 1) * 20,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    select: publicJobSelect,
  });
  return {
    jobs: jobs.map((job) => ({
      ...job,
      match: profile ? matchJob(job, profile) : null,
    })),
    total,
    page: filters.page,
  };
}
export async function publicTalentJob(id: string) {
  const job = await prisma.job.findFirst({
    where: { id, ...publicJobWhere() },
    select: publicJobSelect,
  });
  assertTalent(job, 404, "This job is not accepting applications");
  return job;
}
export async function saveTalentJob(
  userId: string,
  input: unknown,
  id?: string,
) {
  const parsed = jobSchema.parse(input);
  assertTalent(
    parsed.status !== "ARCHIVED",
    400,
    "Use Finish recruitment to archive this job and start its retention period",
  );
  return talentTransaction(async (db) => {
    const existing = id ? await jobAccess(userId, id, "write", db) : null;
    const access =
      existing ||
      (await hiringAccess(userId, parsed.hiringProfileId, "create_job", db));
    assertTalent(
      access.profile.id === parsed.hiringProfileId,
      400,
      "A job cannot be moved to another hiring identity",
    );
    assertTalent(
      access.profile.verification !== "SUSPENDED",
      403,
      "Hiring access is suspended",
    );
    if (parsed.status === "PUBLISHED")
      assertTalent(
        access.profile.verification === "VERIFIED",
        403,
        "Verify your hiring identity before publishing",
      );
    const { version, closesAt, ...data } = parsed;
    let job;
    if (id && existing) {
      assertTalent(
        !existing.job.recruitmentClosedAt,
        409,
        "Recruitment is finished; create a new job",
      );
      assertTalent(
        version === existing.job.version,
        409,
        "This job changed; reload before saving",
      );
      const changed = await db.job.updateMany({
        where: { id, version },
        data: {
          ...data,
          organization: access.profile.name,
          closesAt: closesAt ? new Date(closesAt) : null,
          version: { increment: 1 },
          ...(parsed.status === "PUBLISHED" && !existing.job.publishedAt
            ? { publishedAt: new Date() }
            : {}),
        },
      });
      assertTalent(
        changed.count === 1,
        409,
        "This job changed; reload before saving",
      );
      job = await db.job.findUniqueOrThrow({ where: { id } });
    } else {
      job = await db.job.create({
        data: {
          ...data,
          employerId: userId,
          organization: access.profile.name,
          closesAt: closesAt ? new Date(closesAt) : null,
          publishedAt: parsed.status === "PUBLISHED" ? new Date() : null,
        },
      });
      if (access.member && access.role === "RECRUITER")
        await db.talentJobAssignment.create({
          data: { jobId: job.id, memberId: access.member.id },
        });
    }
    return job;
  });
}
export async function listManagedJobs(userId: string) {
  await talentActor(userId);
  return prisma.job
    .findMany({
      where: {
        hiringProfile: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId, revokedAt: null, role: "ADMIN" } } },
          ],
        },
      },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    })
    .then(async (owned) => {
      const assigned = await prisma.job.findMany({
        where: {
          assignments: { some: { member: { userId, revokedAt: null } } },
        },
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: "desc" },
      });
      return [
        ...new Map(
          [...owned, ...assigned].map((job) => [job.id, job]),
        ).values(),
      ];
    });
}
export async function finishRecruitment(userId: string, id: string) {
  return talentTransaction(async (db) => {
    const { job } = await jobAccess(userId, id, "write", db);
    assertTalent(
      !job.recruitmentClosedAt,
      409,
      "Recruitment is already finished",
    );
    const active = await db.jobApplication.count({
      where: {
        jobId: id,
        status: { notIn: ["HIRED", "REJECTED", "WITHDRAWN"] },
      },
    });
    assertTalent(
      active === 0,
      409,
      "Record a final outcome for every application before finishing recruitment",
    );
    const now = new Date(),
      retainedUntil = new Date(now);
    retainedUntil.setUTCFullYear(retainedUntil.getUTCFullYear() + 1);
    await db.job.update({
      where: { id },
      data: {
        recruitmentClosedAt: now,
        status: "ARCHIVED",
        version: { increment: 1 },
      },
    });
    await db.jobApplication.updateMany({
      where: { jobId: id },
      data: { retainedUntil },
    });
    await db.talentConversation.updateMany({
      where: { jobId: id },
      data: { retainedUntil },
    });
    return { ok: true, retainedUntil };
  });
}
