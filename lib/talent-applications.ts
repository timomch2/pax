import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  applicationSchema,
  applicationConfigSchema,
  applicationValidation,
  applicationTransitions,
} from "@/lib/talent-validation";
import {
  assertTalent,
  cleanOwnedAsset,
  jobAccess,
  talentActor,
  talentTransaction,
} from "@/lib/talent-access";
import { careerSnapshot, sharedGps } from "@/lib/talent-profiles";
import { notifyTalent } from "@/lib/talent-notifications";

export async function saveApplicationDraft(
  userId: string,
  jobId: string,
  input: unknown,
) {
  const data = applicationSchema.parse(input);
  return talentTransaction(async (db) => {
    await talentActor(userId, db);
    const job = await db.job.findUnique({ where: { id: jobId } });
    assertTalent(job && !job.recruitmentClosedAt, 404, "Job not found");
    for (const id of [
      data.resumeAssetId,
      data.coverLetterAssetId,
      ...data.documentAssetIds,
    ].filter(Boolean) as string[])
      await cleanOwnedAsset(
        userId,
        id,
        ["TALENT_RESUME", "TALENT_DOCUMENT"],
        db,
        true,
      );
    await sharedGps(userId, data.sharedGpsIds, db);
    return db.talentApplicationDraft.upsert({
      where: { jobId_userId: { jobId, userId } },
      create: { jobId, userId, content: data },
      update: { content: data },
    });
  });
}
export async function submitTalentApplication(
  userId: string,
  jobId: string,
  input: unknown,
) {
  const data = applicationSchema.parse(input);
  return talentTransaction(async (db) => {
    const user = await talentActor(userId, db);
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        hiringProfile: {
          include: {
            owner: { select: { accountStatus: true } },
            members: { where: { userId, revokedAt: null } },
          },
        },
      },
    });
    assertTalent(
      job?.hiringProfile &&
        job.status === "PUBLISHED" &&
        !job.recruitmentClosedAt &&
        (!job.closesAt || job.closesAt > new Date()) &&
        job.hiringProfile.verification === "VERIFIED" &&
        job.hiringProfile.owner.accountStatus === "ACTIVE",
      409,
      "This job is not accepting applications",
    );
    assertTalent(
      job.version === data.jobVersion,
      409,
      "The job changed; review the latest requirements before submitting",
    );
    assertTalent(
      job.hiringProfile.ownerId !== userId &&
        job.employerId !== userId &&
        !job.hiringProfile.members.length,
      400,
      "You cannot apply to a job from your own hiring team",
    );
    assertTalent(
      !(await db.jobApplication.findUnique({
        where: { jobId_applicantId: { jobId, applicantId: userId } },
      })),
      409,
      "You have already applied to this job",
    );
    const error = applicationValidation(
      applicationConfigSchema.parse(job.applicationConfig),
      data,
    );
    assertTalent(!error, 400, error || "Invalid application");
    await cleanOwnedAsset(userId, data.resumeAssetId, ["TALENT_RESUME"], db);
    const letter = await cleanOwnedAsset(
      userId,
      data.coverLetterAssetId,
      ["TALENT_DOCUMENT"],
      db,
    );
    assertTalent(
      !letter ||
        [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(letter.expectedContentType),
      400,
      "Cover letters must be PDF or DOCX",
    );
    for (const id of data.documentAssetIds) {
      const asset = await cleanOwnedAsset(userId, id, ["TALENT_DOCUMENT"], db);
      assertTalent(
        asset &&
          ["application/pdf", "image/jpeg", "image/png"].includes(
            asset.expectedContentType,
          ),
        400,
        "Supporting evidence must be PDF or images",
      );
    }
    const profile = await careerSnapshot(userId, data.sharedGpsIds, db);
    const application = await db.jobApplication.create({
      data: {
        jobId,
        applicantId: userId,
        coverLetter: data.coverLetter,
        resumeAssetId: data.resumeAssetId,
        attachmentIds: [
          data.coverLetterAssetId,
          ...data.documentAssetIds,
        ].filter(Boolean) as string[],
        answers: data.answers,
        snapshot: {
          profile,
          job: {
            title: job.title,
            organization: job.organization,
            summary: job.summary,
            responsibilities: job.responsibilities,
            requirements: job.requirements,
            version: job.version,
            applicationConfig: job.applicationConfig,
          },
          contact: { email: user.email },
          coverLetterAssetId: data.coverLetterAssetId,
          sharedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        statusEvents: { create: { toStatus: "SUBMITTED", actorId: userId } },
      },
    });
    await db.talentApplicationDraft.deleteMany({ where: { jobId, userId } });
    await db.talentConversation.upsert({
      where: { jobId_candidateId: { jobId, candidateId: userId } },
      create: { jobId, candidateId: userId, status: "ACCEPTED" },
      update: { status: "ACCEPTED" },
    });
    for (const recipient of [
      ...new Set([userId, job.hiringProfile.ownerId, job.employerId]),
    ])
      await notifyTalent(db, {
        userId: recipient,
        summary:
          recipient === userId
            ? "Your application was submitted."
            : "A new application is available for review.",
        path: `/talent/applications/${application.id}`,
        type: "application",
        resourceId: application.id,
        key: `submitted:${application.id}`,
      });
    return application;
  });
}
export async function applicationView(userId: string, id: string) {
  await talentActor(userId);
  const app = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: { select: { title: true, organization: true } },
      statusEvents: {
        orderBy: { createdAt: "asc" },
        select: { toStatus: true, createdAt: true },
      },
    },
  });
  assertTalent(app, 404, "Application not found");
  const isCandidate = app.applicantId === userId;
  const access = isCandidate ? null : await jobAccess(userId, app.jobId);
  const hidden = Boolean(
    app.redactedAt || (!isCandidate && app.status === "WITHDRAWN"),
  );
  const notes =
    !isCandidate && !hidden
      ? await prisma.talentApplicationNote.findMany({
          where: { applicationId: id },
          orderBy: { createdAt: "desc" },
        })
      : undefined;
  return {
    ...app,
    snapshot: hidden ? null : app.snapshot,
    answers: hidden ? null : app.answers,
    coverLetter: hidden ? "" : app.coverLetter,
    resumeAssetId: hidden ? null : app.resumeAssetId,
    attachmentIds: hidden ? [] : app.attachmentIds,
    notes,
    isCandidate,
    canManage: Boolean(access && access.role !== "REVIEWER"),
    allowedStatuses:
      access && access.role !== "REVIEWER"
        ? applicationTransitions[app.status] || []
        : [],
  };
}
export async function changeApplicationStatus(
  userId: string,
  id: string,
  input: unknown,
) {
  const data = z
    .object({
      status: z.enum([
        "UNDER_REVIEW",
        "SHORTLISTED",
        "INTERVIEW",
        "OFFERED",
        "HIRED",
        "REJECTED",
        "WITHDRAWN",
      ]),
      expectedStatus: z.string(),
    })
    .strict()
    .parse(input);
  return talentTransaction(async (db) => {
    await talentActor(userId, db);
    const app = await db.jobApplication.findUnique({ where: { id } });
    assertTalent(app && !app.redactedAt, 404, "Application not found");
    assertTalent(
      app.status === data.expectedStatus,
      409,
      "Application changed; reload before updating",
    );
    if (data.status === "WITHDRAWN") {
      assertTalent(app.applicantId === userId, 404, "Application not found");
      assertTalent(
        !["HIRED", "REJECTED", "WITHDRAWN"].includes(app.status),
        409,
        "This application cannot be withdrawn",
      );
    } else {
      const access = await jobAccess(userId, app.jobId, "write", db);
      assertTalent(
        !access.job.recruitmentClosedAt,
        409,
        "Recruitment is finished",
      );
      assertTalent(
        applicationTransitions[app.status]?.includes(data.status),
        409,
        "That status transition is not available",
      );
    }
    const changed = await db.jobApplication.updateMany({
      where: { id, status: app.status },
      data: {
        status: data.status,
        ...(data.status === "WITHDRAWN" ? { withdrawnAt: new Date() } : {}),
      },
    });
    assertTalent(
      changed.count === 1,
      409,
      "Application changed; reload before updating",
    );
    const event = await db.jobApplicationStatusEvent.create({
      data: {
        applicationId: id,
        fromStatus: app.status,
        toStatus: data.status,
        actorId: userId,
      },
    });
    if (data.status === "WITHDRAWN")
      await db.talentConversation.updateMany({
        where: { jobId: app.jobId, candidateId: userId },
        data: { status: "DECLINED" },
      });
    await notifyTalent(db, {
      userId: app.applicantId,
      summary: "Your application status has changed.",
      path: `/talent/applications/${id}`,
      type: "application",
      resourceId: id,
      key: `status:${event.id}`,
    });
    return { ok: true };
  });
}
export async function addApplicationNote(
  userId: string,
  id: string,
  body: string,
) {
  const text = z.string().trim().min(1).max(5000).parse(body);
  return talentTransaction(async (db) => {
    const app = await db.jobApplication.findUnique({ where: { id } });
    assertTalent(
      app && !app.redactedAt && app.status !== "WITHDRAWN",
      404,
      "Application not found",
    );
    await jobAccess(userId, app.jobId, "note", db);
    return db.talentApplicationNote.create({
      data: { applicationId: id, actorId: userId, body: text },
    });
  });
}
