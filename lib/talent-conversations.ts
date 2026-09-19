import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  assertTalent,
  jobAccess,
  talentActor,
  talentTransaction,
  type TalentDb,
} from "@/lib/talent-access";
import { notifyTalent } from "@/lib/talent-notifications";

export async function conversationAccess(
  userId: string,
  id: string,
  db: TalentDb = prisma,
) {
  await talentActor(userId, db);
  const conversation = await db.talentConversation.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          hiringProfile: {
            include: { owner: { select: { accountStatus: true } } },
          },
        },
      },
    },
  });
  assertTalent(
    conversation && !conversation.redactedAt && conversation.job.hiringProfile,
    404,
    "Conversation not found",
  );
  if (conversation.candidateId !== userId)
    await jobAccess(userId, conversation.jobId, "write", db);
  const blocked = await db.talentBlock.findUnique({
    where: {
      userId_hiringProfileId: {
        userId: conversation.candidateId,
        hiringProfileId: conversation.job.hiringProfile.id,
      },
    },
  });
  return { conversation, blocked: Boolean(blocked) };
}
export async function inviteCandidate(
  userId: string,
  jobId: string,
  candidateId: string,
) {
  return talentTransaction(async (db) => {
    const { job, profile } = await jobAccess(userId, jobId, "write", db);
    assertTalent(
      profile.verification === "VERIFIED" &&
        job.status === "PUBLISHED" &&
        (!job.closesAt || job.closesAt > new Date()) &&
        !job.recruitmentClosedAt,
      409,
      "Only open jobs from verified hiring identities can invite candidates",
    );
    const candidate = await db.talentProfile.findUnique({
      where: { userId: candidateId },
      include: { user: { select: { accountStatus: true } } },
    });
    assertTalent(
      candidate &&
        candidate.visibility !== "PRIVATE" &&
        candidate.user.accountStatus === "ACTIVE",
      404,
      "Candidate is not available for invitations",
    );
    assertTalent(
      candidateId !== userId && candidateId !== profile.ownerId,
      400,
      "You cannot invite yourself",
    );
    assertTalent(
      !(await db.talentMember.findFirst({
        where: {
          userId: candidateId,
          hiringProfileId: profile.id,
          revokedAt: null,
        },
      })),
      400,
      "This person is part of your hiring team",
    );
    assertTalent(
      !(await db.talentBlock.findUnique({
        where: {
          userId_hiringProfileId: {
            userId: candidateId,
            hiringProfileId: profile.id,
          },
        },
      })),
      404,
      "Candidate is not available for invitations",
    );
    assertTalent(
      !(await db.talentConversation.findUnique({
        where: { jobId_candidateId: { jobId, candidateId } },
      })),
      409,
      "An invitation or conversation already exists",
    );
    const daily = await db.talentConversation.count({
      where: {
        invitedById: userId,
        createdAt: { gt: new Date(Date.now() - 86400000) },
      },
    });
    assertTalent(daily < 20, 429, "Daily candidate invitation limit reached");
    const recent = await db.talentConversation.count({
      where: {
        candidateId,
        job: { hiringProfileId: profile.id },
        createdAt: { gt: new Date(Date.now() - 7 * 86400000) },
      },
    });
    assertTalent(
      recent < 3,
      429,
      "This candidate has recently received invitations from your organization",
    );
    const conversation = await db.talentConversation.create({
      data: { jobId, candidateId, invitedById: userId },
    });
    await notifyTalent(db, {
      userId: candidateId,
      summary:
        "You have been invited to discuss a job. Accept the invitation to start a conversation.",
      path: "/talent/messages",
      type: "conversation",
      resourceId: conversation.id,
      key: `invite:${conversation.id}`,
    });
    return conversation;
  });
}
export async function answerCandidateInvitation(
  userId: string,
  id: string,
  accept: boolean,
) {
  return talentTransaction(async (db) => {
    const { conversation, blocked } = await conversationAccess(userId, id, db);
    assertTalent(
      conversation.candidateId === userId && conversation.status === "INVITED",
      409,
      "Invitation cannot be changed",
    );
    if (accept)
      assertTalent(
        !blocked &&
          conversation.job.status === "PUBLISHED" &&
          (!conversation.job.closesAt ||
            conversation.job.closesAt > new Date()) &&
          conversation.job.hiringProfile?.verification === "VERIFIED" &&
          conversation.job.hiringProfile.owner.accountStatus === "ACTIVE",
        409,
        "This job is no longer available",
      );
    await db.talentConversation.update({
      where: { id },
      data: { status: accept ? "ACCEPTED" : "DECLINED" },
    });
    return { ok: true };
  });
}
export async function sendTalentMessage(
  userId: string,
  id: string,
  input: unknown,
) {
  const data = z
    .object({
      body: z.string().trim().min(1).max(5000),
      clientId: z.string().uuid(),
    })
    .strict()
    .parse(input);
  return talentTransaction(async (db) => {
    const { conversation, blocked } = await conversationAccess(userId, id, db);
    assertTalent(
      !blocked &&
        conversation.status === "ACCEPTED" &&
        !conversation.job.recruitmentClosedAt &&
        conversation.job.hiringProfile?.verification === "VERIFIED" &&
        conversation.job.hiringProfile.owner.accountStatus === "ACTIVE",
      403,
      "Messaging is not available for this conversation",
    );
    const previous = await db.talentMessage.findUnique({
      where: {
        conversationId_senderId_clientId: {
          conversationId: id,
          senderId: userId,
          clientId: data.clientId,
        },
      },
    });
    if (previous) return previous;
    assertTalent(
      (await db.talentMessage.count({
        where: {
          senderId: userId,
          createdAt: { gt: new Date(Date.now() - 60000) },
        },
      })) < 20,
      429,
      "Please wait before sending more messages",
    );
    const message = await db.talentMessage.create({
      data: { ...data, conversationId: id, senderId: userId },
    });
    await db.talentConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    const recipients =
      userId === conversation.candidateId
        ? [conversation.job.hiringProfile.ownerId, conversation.job.employerId]
        : [conversation.candidateId];
    for (const recipient of [...new Set(recipients)])
      await notifyTalent(db, {
        userId: recipient,
        summary: "You have a new recruitment message.",
        path: "/talent/messages",
        type: "conversation",
        resourceId: id,
        key: `message:${message.id}`,
      });
    return message;
  });
}
