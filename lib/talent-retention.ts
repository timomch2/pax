import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { talentTransaction, type TalentDb } from "@/lib/talent-access";

export async function talentAssetReferenced(id: string, db: TalentDb = prisma) {
  return Boolean(
    (await db.jobApplication.findFirst({
      where: {
        redactedAt: null,
        OR: [{ resumeAssetId: id }, { attachmentIds: { has: id } }],
      },
      select: { id: true },
    })) ||
      (await db.talentProfile.findFirst({
        where: { OR: [{ savedResumeAssetId: id }, { avatarAssetId: id }] },
        select: { userId: true },
      })) ||
      (await db.talentHiringProfile.findFirst({
        where: {
          OR: [{ logoAssetId: id }, { verificationAssetIds: { has: id } }],
        },
        select: { id: true },
      })) ||
      (await db.talentApplicationDraft.findFirst({
        where: {
          OR: [
            { content: { path: ["resumeAssetId"], equals: id } },
            { content: { path: ["coverLetterAssetId"], equals: id } },
            { content: { path: ["documentAssetIds"], array_contains: [id] } },
          ],
        },
        select: { userId: true },
      })),
  );
}
async function redactApplication(id: string, now: Date, db: TalentDb) {
  const app = await db.jobApplication.findUniqueOrThrow({ where: { id } });
  if (app.retentionHold || app.redactedAt) return;
  const ids = [app.resumeAssetId, ...app.attachmentIds].filter(
    Boolean,
  ) as string[];
  await db.jobApplication.update({
    where: { id },
    data: {
      snapshot: Prisma.DbNull,
      answers: Prisma.DbNull,
      resumeAssetId: null,
      attachmentIds: [],
      coverLetter: "",
      redactedAt: now,
    },
  });
  await db.talentApplicationNote.deleteMany({ where: { applicationId: id } });
  await db.jobApplicationStatusEvent.updateMany({
    where: { applicationId: id },
    data: { note: null },
  });
  for (const assetId of ids)
    if (!(await talentAssetReferenced(assetId, db)))
      await db.uploadAsset.updateMany({
        where: {
          id: assetId,
          purpose: { in: ["TALENT_RESUME", "TALENT_DOCUMENT"] },
        },
        data: {
          status: "REJECTED",
          retainedUntil: now,
          scanResult: "Recruitment retention: deletion queued",
        },
      });
}
export async function runTalentRetention(execute = false, now = new Date()) {
  const where = {
    retainedUntil: { lte: now },
    retentionHold: false,
    redactedAt: null,
  };
  if (!execute)
    return {
      applications: await prisma.jobApplication.count({ where }),
      conversations: await prisma.talentConversation.count({ where }),
    };
  let applications = 0,
    conversations = 0;
  for (const app of await prisma.jobApplication.findMany({
    where,
    select: { id: true },
    take: 100,
  }))
    await talentTransaction(async (db) => {
      const current = await db.jobApplication.findFirst({
        where: { id: app.id, ...where },
      });
      if (current) {
        await redactApplication(app.id, now, db);
        applications++;
      }
    });
  for (const conversation of await prisma.talentConversation.findMany({
    where,
    select: { id: true },
    take: 100,
  }))
    await talentTransaction(async (db) => {
      const current = await db.talentConversation.findFirst({
        where: { id: conversation.id, ...where },
      });
      if (!current) return;
      await db.talentMessage.updateMany({
        where: { conversationId: current.id },
        data: { body: "" },
      });
      await db.talentConversation.update({
        where: { id: current.id },
        data: { redactedAt: now },
      });
      conversations++;
    });
  await prisma.talentApplicationDraft.deleteMany({
    where: {
      OR: [
        { updatedAt: { lt: new Date(now.getTime() - 90 * 86400000) } },
        { job: { recruitmentClosedAt: { not: null } } },
      ],
    },
  });
  let cursor: string | undefined;
  do {
    const assets = await prisma.uploadAsset.findMany({
      where: {
        purpose: { in: ["TALENT_RESUME", "TALENT_DOCUMENT"] },
        retainedUntil: { lte: now },
        status: { in: ["CLEAN", "QUARANTINED", "SCANNING"] },
      },
      take: 100,
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const asset of assets)
      await talentTransaction(async (db) => {
        if (!(await talentAssetReferenced(asset.id, db)))
          await db.uploadAsset.update({
            where: { id: asset.id },
            data: {
              status: "REJECTED",
              retainedUntil: now,
              scanResult: "Unreferenced Talent document: deletion queued",
            },
          });
      });
    cursor = assets.length === 100 ? assets.at(-1)!.id : undefined;
  } while (cursor);
  return { applications, conversations };
}
/** Erase discretionary Talent data within the existing approved account-erasure transaction. */
export async function eraseTalentData(userId: string, db: TalentDb) {
  const now = new Date();
  const heldAssetIds: string[] = [];
  for (const app of await db.jobApplication.findMany({
    where: { applicantId: userId, redactedAt: null },
  })) {
    if (app.retentionHold)
      heldAssetIds.push(
        ...([app.resumeAssetId, ...app.attachmentIds].filter(
          Boolean,
        ) as string[]),
      );
    else await redactApplication(app.id, now, db);
  }
  await db.talentProfile.deleteMany({ where: { userId } });
  await db.talentApplicationDraft.deleteMany({ where: { userId } });
  await db.talentSavedJob.deleteMany({ where: { userId } });
  await db.talentSavedSearch.deleteMany({ where: { userId } });
  await db.talentBlock.deleteMany({ where: { userId } });
  await db.talentMember.updateMany({
    where: { userId },
    data: { revokedAt: now },
  });
  await db.talentTeamInvitation.updateMany({
    where: { invitedById: userId, acceptedAt: null },
    data: { revokedAt: now },
  });
  for (const conversation of await db.talentConversation.findMany({
    where: { candidateId: userId, retentionHold: false },
  })) {
    await db.talentMessage.updateMany({
      where: { conversationId: conversation.id },
      data: { body: "" },
    });
    await db.talentConversation.update({
      where: { id: conversation.id },
      data: { redactedAt: now },
    });
  }
  await db.talentApplicationNote.updateMany({
    where: { actorId: userId, application: { retentionHold: false } },
    data: { body: "" },
  });
  await db.talentMessage.updateMany({
    where: { senderId: userId, conversation: { retentionHold: false } },
    data: { body: "" },
  });
  await db.talentHiringProfile.updateMany({
    where: { ownerId: userId, kind: "PERSONAL" },
    data: { name: "Deleted hiring profile" },
  });
  await db.talentHiringProfile.updateMany({
    where: { ownerId: userId },
    data: {
      verification: "SUSPENDED",
      verificationStatement: "",
      verificationNote: null,
      verificationAssetIds: [],
      description: "",
      website: null,
      logoAssetId: null,
    },
  });
  await db.job.updateMany({
    where: { hiringProfile: { ownerId: userId }, status: "PUBLISHED" },
    data: { status: "CLOSED" },
  });
  return {
    heldAssetIds,
    heldApplications: await db.jobApplication.count({
      where: { applicantId: userId, retentionHold: true },
    }),
  };
}
export async function exportTalentData(userId: string) {
  return {
    profile: await prisma.talentProfile.findUnique({ where: { userId } }),
    applications: await prisma.jobApplication.findMany({
      where: { applicantId: userId },
      select: {
        id: true,
        jobId: true,
        coverLetter: true,
        answers: true,
        snapshot: true,
        status: true,
        submittedAt: true,
        attachmentIds: true,
        resumeAssetId: true,
        statusEvents: { select: { toStatus: true, createdAt: true } },
      },
    }),
    conversations: await prisma.talentConversation.findMany({
      where: { candidateId: userId },
      include: { messages: true },
    }),
    drafts: await prisma.talentApplicationDraft.findMany({ where: { userId } }),
    savedJobs: await prisma.talentSavedJob.findMany({ where: { userId } }),
    searches: await prisma.talentSavedSearch.findMany({ where: { userId } }),
    hiringProfiles: await prisma.talentHiringProfile.findMany({
      where: { ownerId: userId },
    }),
    memberships: await prisma.talentMember.findMany({ where: { userId } }),
  };
}
