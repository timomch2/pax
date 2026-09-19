import {
  enqueueNotification,
  enqueueInAppNotification,
} from "@/lib/notification-service";
import { prisma } from "@/lib/db";
import {
  hiringAccess,
  jobAccess,
  talentActor,
  type TalentDb,
} from "@/lib/talent-access";
import { productNotificationUrl, talentEnabled } from "@/lib/product-hosts";

export const TALENT_NOTIFICATION_TEMPLATES = (["EMAIL", "IN_APP"] as const).map(
  (channel) => ({
    slug: "talent.activity",
    channel,
    subject: "PAX Talent update",
    body:
      channel === "EMAIL"
        ? '<p>{{summary}}</p><p><a href="{{url}}">Open PAX Talent</a></p>'
        : "{{summary}}",
    actionLabel: "Open Talent",
    actionUrl: "{{url}}",
    requiredVariables: ["summary", "url", "resourceType", "resourceId"],
    enabled: true,
    sensitiveAllowed: false,
    nonDisableable: false,
    providerTemplateKey:
      channel === "EMAIL" ? "NOTIF_ID_TALENT_ACTIVITY" : null,
  }),
);
export async function notifyTalent(
  db: TalentDb,
  input: {
    userId: string;
    summary: string;
    path: string;
    type: string;
    resourceId: string;
    key: string;
  },
) {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { email: true, accountStatus: true },
  });
  if (!user || user.accountStatus !== "ACTIVE") return;
  const variables = {
    summary: input.summary,
    url: productNotificationUrl("talent", input.path),
    resourceType: input.type,
    resourceId: input.resourceId,
  };
  const base = {
    userId: input.userId,
    templateSlug: "talent.activity",
    variables,
  };
  await enqueueInAppNotification(db, {
    ...base,
    idempotencyKey: `talent:${input.key}:${input.userId}:app`,
  });
  await enqueueNotification(db, {
    ...base,
    recipient: user.email,
    idempotencyKey: `talent:${input.key}:${input.userId}:email`,
  });
}
export async function talentDeliveryAllowed(
  userId: string | null,
  variables: Record<string, unknown>,
) {
  if (!talentEnabled() || !userId) return false;
  try {
    await talentActor(userId);
    const id = String(variables.resourceId || "");
    switch (variables.resourceType) {
      case "application": {
        const app = await prisma.jobApplication.findUnique({ where: { id } });
        if (!app || app.redactedAt) return false;
        if (app.applicantId === userId) return true;
        if (app.status === "WITHDRAWN") return false;
        await jobAccess(userId, app.jobId, "write");
        return true;
      }
      case "conversation": {
        const conversation = await prisma.talentConversation.findUnique({
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
        if (
          !conversation ||
          conversation.redactedAt ||
          conversation.status === "DECLINED" ||
          !conversation.job.hiringProfileId
        )
          return false;
        const blocked = await prisma.talentBlock.findUnique({
          where: {
            userId_hiringProfileId: {
              userId: conversation.candidateId,
              hiringProfileId: conversation.job.hiringProfileId,
            },
          },
        });
        if (
          blocked ||
          conversation.job.hiringProfile?.verification !== "VERIFIED" ||
          conversation.job.hiringProfile.owner.accountStatus !== "ACTIVE"
        )
          return false;
        if (conversation.candidateId === userId) return true;
        await jobAccess(userId, conversation.jobId, "write");
        return conversation.status === "ACCEPTED";
      }
      case "search":
        return Boolean(
          await prisma.talentSavedSearch.findFirst({
            where: { id, userId, alertsEnabled: true },
          }),
        );
      case "hiring":
        return Boolean(
          await prisma.talentHiringProfile.findFirst({
            where: { id, ownerId: userId },
          }),
        );
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export const TALENT_INVITATION_TEMPLATE = {
  slug: "talent.team-invitation",
  channel: "EMAIL" as const,
  subject: "Invitation to a PAX hiring team",
  body: '<p>You have been invited to a hiring team.</p><p><a href="{{invitationUrl}}">Review invitation</a></p><p>Sign in with this email address. This invitation expires in seven days.</p>',
  actionLabel: "Review invitation",
  actionUrl: "{{invitationUrl}}",
  requiredVariables: ["invitationUrl", "invitationId"],
  enabled: true,
  sensitiveAllowed: false,
  nonDisableable: false,
  providerTemplateKey: "NOTIF_ID_TALENT_TEAM_INVITATION",
};
export async function talentInvitationDeliveryAllowed(
  id: string,
  recipient: string,
) {
  if (!talentEnabled()) return false;
  const invitation = await prisma.talentTeamInvitation.findUnique({
    where: { id },
    include: { hiringProfile: true },
  });
  if (
    !invitation ||
    invitation.email !== recipient ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt <= new Date() ||
    invitation.hiringProfile.verification === "SUSPENDED"
  )
    return false;
  try {
    await hiringAccess(
      invitation.invitedById,
      invitation.hiringProfileId,
      "manage",
    );
    return true;
  } catch {
    return false;
  }
}
