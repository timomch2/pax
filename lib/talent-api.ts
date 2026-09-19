import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  assertTalent,
  cleanOwnedAsset,
  hiringAccess,
  jobAccess,
  publicJobWhere,
  talentActor,
  talentAdmin,
  talentTransaction,
} from "@/lib/talent-access";
import {
  saveTalentProfile,
  viewTalentProfile,
  searchTalentProfiles,
} from "@/lib/talent-profiles";
import {
  saveHiringProfile,
  listHiringProfiles,
  submitHiringVerification,
  reviewHiringProfile,
  inviteTalentMember,
  acceptTalentInvitation,
  manageTalentMember,
} from "@/lib/talent-hiring";
import {
  searchTalentJobs,
  publicTalentJob,
  saveTalentJob,
  listManagedJobs,
  finishRecruitment,
  publicJobSelect,
} from "@/lib/talent-jobs";
import {
  saveApplicationDraft,
  submitTalentApplication,
  applicationView,
  changeApplicationStatus,
  addApplicationNote,
} from "@/lib/talent-applications";
import {
  conversationAccess,
  inviteCandidate,
  answerCandidateInvitation,
  sendTalentMessage,
} from "@/lib/talent-conversations";
import { searchSchema } from "@/lib/talent-validation";
import { getFileUrl } from "@/lib/s3";

export async function dispatchTalent(
  method: string,
  parts: string[],
  url: URL,
  userId: string | undefined,
  body: unknown,
) {
  const [area, id, child, childId] = parts;
  const page = Math.max(
    1,
    Math.min(10000, Number(url.searchParams.get("page")) || 1),
  );
  if (
    method === "GET" &&
    area === "jobs" &&
    !child &&
    url.searchParams.get("mine") !== "1"
  )
    return id
      ? { job: await publicTalentJob(id) }
      : searchTalentJobs(Object.fromEntries(url.searchParams), userId);
  if (method === "GET" && area === "people") {
    if (!id)
      return searchTalentProfiles(
        userId,
        (url.searchParams.get("q") || "").slice(0, 120),
        page,
      );
    const profile = await viewTalentProfile(
      id,
      userId,
      url.searchParams.get("preview") || undefined,
    );
    if (child === "photo") {
      assertTalent(profile.avatarAssetId, 404, "Photo not found");
      const asset = await prisma.uploadAsset.findFirst({
        where: {
          id: profile.avatarAssetId,
          ownerId: id,
          purpose: "PROFILE_IMAGE",
          status: "CLEAN",
        },
      });
      assertTalent(asset, 404, "Photo not found");
      return {
        redirect: await getFileUrl(
          asset.objectKey,
          asset.expectedContentType,
          asset.originalFileName,
        ),
      };
    }
    return { profile };
  }
  if (method === "GET" && area === "companies" && id) {
    const profile = await prisma.talentHiringProfile.findFirst({
      where: {
        slug: id,
        verification: "VERIFIED",
        owner: { accountStatus: "ACTIVE" },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        location: true,
        country: true,
        website: true,
        kind: true,
        logoAssetId: true,
        jobs: { where: publicJobWhere(), select: publicJobSelect },
      },
    });
    assertTalent(profile, 404, "Company not found");
    if (child === "logo") {
      const asset =
        profile.logoAssetId &&
        (await prisma.uploadAsset.findFirst({
          where: {
            id: profile.logoAssetId,
            status: "CLEAN",
            purpose: "PROFILE_IMAGE",
          },
        }));
      assertTalent(asset, 404, "Logo not found");
      return {
        redirect: await getFileUrl(
          asset.objectKey,
          asset.expectedContentType,
          asset.originalFileName,
        ),
      };
    }
    return { profile };
  }
  assertTalent(userId, 401, "Unauthorized");
  const user = await talentActor(userId);
  if (area === "me") {
    if (method === "GET")
      return {
        user,
        profile: await prisma.talentProfile.findUnique({ where: { userId } }),
        hiringProfiles: await listHiringProfiles(userId),
      };
    if (method === "PUT")
      return { profile: await saveTalentProfile(userId, body) };
  }
  if (area === "assets") {
    if (method === "GET")
      return {
        assets: await prisma.uploadAsset.findMany({
          where: {
            ownerId: userId,
            ...(id
              ? { id }
              : {
                  purpose: {
                    in: [
                      "TALENT_RESUME",
                      "TALENT_DOCUMENT",
                      "PROFILE_IMAGE",
                      "VERIFICATION_DOCUMENT",
                    ],
                  },
                }),
          },
          select: {
            id: true,
            originalFileName: true,
            purpose: true,
            status: true,
            createdAt: true,
            contentValidatedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      };
  }
  if (area === "hiring") {
    if (method === "GET" && !id)
      return { profiles: await listHiringProfiles(userId) };
    if ((method === "POST" && !id) || (method === "PUT" && id && !child))
      return { profile: await saveHiringProfile(userId, body, id) };
    if (method === "GET" && id) {
      const access = await hiringAccess(userId, id, "read");
      const canManage = ["OWNER", "ADMIN"].includes(access.role);
      return {
        profile: {
          ...access.profile,
          owner: undefined,
          members: undefined,
          ...(canManage
            ? {}
            : {
                verificationAssetIds: [],
                verificationStatement: "",
                verificationNote: null,
              }),
        },
        myRole: access.role,
        members: canManage
          ? await prisma.talentMember.findMany({
              where: { hiringProfileId: id },
              include: {
                user: { select: { name: true, email: true } },
                assignments: { select: { jobId: true } },
              },
            })
          : [],
        invitations: canManage
          ? await prisma.talentTeamInvitation.findMany({
              where: { hiringProfileId: id },
              select: {
                id: true,
                email: true,
                role: true,
                acceptedAt: true,
                revokedAt: true,
                expiresAt: true,
              },
            })
          : [],
      };
    }
    if (method === "POST" && child === "verify")
      return { profile: await submitHiringVerification(userId, id) };
    if (method === "POST" && child === "invitations")
      return inviteTalentMember(userId, id, body);
    if (method === "DELETE" && child === "invitations" && childId) {
      await hiringAccess(userId, id, "manage");
      await prisma.talentTeamInvitation.updateMany({
        where: { id: childId, hiringProfileId: id, acceptedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    }
    if (method === "PATCH" && child === "members" && childId)
      return manageTalentMember(userId, id, childId, body);
    if (method === "POST" && child === "legacy") {
      const { profile } = await hiringAccess(userId, id, "owner");
      const result = await prisma.job.updateMany({
        where: { employerId: userId, hiringProfileId: null },
        data: { hiringProfileId: profile.id },
      });
      return { linked: result.count };
    }
  }
  if (area === "team-invitations" && method === "POST") {
    const data = z.object({ token: z.string() }).strict().parse(body);
    return { membership: await acceptTalentInvitation(userId, data.token) };
  }
  if (area === "jobs") {
    if (method === "GET" && !id)
      return {
        jobs: await listManagedJobs(userId),
        legacyCount: await prisma.job.count({
          where: { employerId: userId, hiringProfileId: null },
        }),
      };
    if (method === "GET" && id && child === "manage") {
      const access = await jobAccess(userId, id);
      return {
        job: access.job,
        role: access.role,
        assignments: await prisma.talentJobAssignment.findMany({
          where: { jobId: id },
        }),
      };
    }
    if ((method === "POST" && !id) || (method === "PUT" && id && !child))
      return { job: await saveTalentJob(userId, body, id) };
    if (method === "POST" && child === "finish")
      return finishRecruitment(userId, id);
    if (method === "PUT" && child === "assignments") {
      const data = z
        .object({ memberIds: z.array(z.string()).max(100) })
        .strict()
        .parse(body);
      return talentTransaction(async (db) => {
        const { job } = await jobAccess(userId, id, "write", db);
        await hiringAccess(userId, job.hiringProfileId!, "manage", db);
        const members = await db.talentMember.findMany({
          where: {
            hiringProfileId: job.hiringProfileId!,
            id: { in: data.memberIds },
            revokedAt: null,
          },
        });
        assertTalent(
          members.length === new Set(data.memberIds).size,
          400,
          "Choose active members of this company",
        );
        await db.talentJobAssignment.deleteMany({ where: { jobId: id } });
        await db.talentJobAssignment.createMany({
          data: members.map((member) => ({ jobId: id, memberId: member.id })),
        });
        return { ok: true };
      });
    }
    if (method === "POST" && child === "invite")
      return {
        conversation: await inviteCandidate(
          userId,
          id,
          z.object({ candidateId: z.string() }).strict().parse(body)
            .candidateId,
        ),
      };
    if (child === "draft") {
      if (method === "GET")
        return {
          draft: await prisma.talentApplicationDraft.findUnique({
            where: { jobId_userId: { jobId: id, userId } },
          }),
        };
      if (method === "PUT")
        return { draft: await saveApplicationDraft(userId, id, body) };
    }
    if (method === "POST" && child === "apply")
      return { application: await submitTalentApplication(userId, id, body) };
  }
  if (area === "applications") {
    if (method === "GET" && !id) {
      const jobId = url.searchParams.get("jobId");
      if (jobId) await jobAccess(userId, jobId);
      const status = url.searchParams.get("status");
      const allowedStatuses = [
        "SUBMITTED",
        "UNDER_REVIEW",
        "SHORTLISTED",
        "INTERVIEW",
        "OFFERED",
        "HIRED",
        "REJECTED",
        "WITHDRAWN",
      ];
      assertTalent(
        !status || allowedStatuses.includes(status),
        400,
        "Invalid status filter",
      );
      const where: Prisma.JobApplicationWhereInput = {
        ...(jobId ? { jobId } : { applicantId: userId }),
        ...(status ? { status: status as never } : {}),
      };
      const applications = await prisma.jobApplication.findMany({
        where,
        select: {
          id: true,
          jobId: true,
          status: true,
          submittedAt: true,
          redactedAt: true,
          job: { select: { title: true, organization: true } },
          applicant: { select: { name: true } },
        },
        orderBy: [{ submittedAt: "desc" }, { id: "asc" }],
        take: 20,
        skip: (page - 1) * 20,
      });
      return {
        applications: applications.map((app) => ({
          ...app,
          applicant:
            app.redactedAt || app.status === "WITHDRAWN"
              ? { name: "Personal content unavailable" }
              : app.applicant,
        })),
        total: await prisma.jobApplication.count({ where }),
        page,
      };
    }
    if (method === "GET" && id)
      return { application: await applicationView(userId, id) };
    if (method === "PATCH" && id)
      return changeApplicationStatus(userId, id, body);
    if (method === "POST" && child === "notes")
      return {
        note: await addApplicationNote(
          userId,
          id,
          z.object({ body: z.string() }).strict().parse(body).body,
        ),
      };
  }
  if (area === "conversations") {
    if (method === "GET" && !id) {
      const jobs = await listManagedJobs(userId);
      const permitted = [];
      for (const job of jobs) {
        try {
          await jobAccess(userId, job.id, "write");
          permitted.push(job.id);
        } catch {
          /* Reviewers have no messaging access. */
        }
      }
      return {
        conversations: await prisma.talentConversation.findMany({
          where: {
            redactedAt: null,
            OR: [{ candidateId: userId }, { jobId: { in: permitted } }],
          },
          select: {
            id: true,
            candidateId: true,
            status: true,
            job: { select: { title: true, organization: true } },
            candidate: { select: { name: true } },
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
          skip: (page - 1) * 50,
        }),
      };
    }
    if (method === "GET" && id) {
      const { conversation, blocked } = await conversationAccess(userId, id);
      const messages =
        conversation.status === "ACCEPTED"
          ? await prisma.talentMessage.findMany({
              where: { conversationId: id },
              orderBy: { createdAt: "desc" },
              take: 50,
              skip: (page - 1) * 50,
            })
          : [];
      return {
        conversation: {
          id,
          candidateId: conversation.candidateId,
          status: conversation.status,
          jobId: conversation.jobId,
          hiringProfileId: conversation.job.hiringProfileId,
          title: conversation.job.title,
          organization: conversation.job.organization,
        },
        blocked,
        messages: messages.reverse(),
        hasMore: messages.length === 50,
      };
    }
    if (method === "PATCH" && id)
      return answerCandidateInvitation(
        userId,
        id,
        z.object({ accept: z.boolean() }).strict().parse(body).accept,
      );
    if (method === "POST" && child === "messages")
      return { message: await sendTalentMessage(userId, id, body) };
  }
  if (area === "blocks" && id) {
    if (method === "POST") {
      assertTalent(
        await prisma.talentHiringProfile.findUnique({ where: { id } }),
        404,
        "Hiring profile not found",
      );
      await prisma.talentBlock.upsert({
        where: { userId_hiringProfileId: { userId, hiringProfileId: id } },
        create: { userId, hiringProfileId: id },
        update: {},
      });
      return { ok: true };
    }
    if (method === "DELETE") {
      await prisma.talentBlock.deleteMany({
        where: { userId, hiringProfileId: id },
      });
      return { ok: true };
    }
  }
  if (area === "saved-jobs") {
    if (method === "GET")
      return {
        saved: await prisma.talentSavedJob.findMany({
          where: { userId },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                organization: true,
                status: true,
                closesAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      };
    if (method === "POST" && id) {
      await publicTalentJob(id);
      await prisma.talentSavedJob.upsert({
        where: { userId_jobId: { userId, jobId: id } },
        create: { userId, jobId: id },
        update: {},
      });
      return { ok: true };
    }
    if (method === "DELETE" && id) {
      await prisma.talentSavedJob.deleteMany({ where: { userId, jobId: id } });
      return { ok: true };
    }
  }
  if (area === "saved-searches") {
    if (method === "GET")
      return {
        searches: await prisma.talentSavedSearch.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
      };
    if (method === "POST" || (method === "PUT" && id)) {
      const data = z
        .object({
          name: z.string().trim().min(1).max(120),
          filters: searchSchema,
          alertsEnabled: z.boolean(),
        })
        .strict()
        .parse(body);
      if (id) {
        const updated = await prisma.talentSavedSearch.updateMany({
          where: { id, userId },
          data,
        });
        assertTalent(updated.count, 404, "Saved search not found");
        return { ok: true };
      }
      assertTalent(
        (await prisma.talentSavedSearch.count({ where: { userId } })) < 20,
        400,
        "You can save up to twenty searches",
      );
      return {
        search: await prisma.talentSavedSearch.create({
          data: { ...data, userId },
        }),
      };
    }
    if (method === "DELETE" && id) {
      await prisma.talentSavedSearch.deleteMany({ where: { id, userId } });
      return { ok: true };
    }
  }
  if (area === "reports" && method === "POST") {
    const data = z
      .object({
        targetType: z.enum(["JOB", "CONVERSATION"]),
        targetId: z.string(),
        reason: z.string().trim().min(10).max(2000),
      })
      .strict()
      .parse(body);
    if (data.targetType === "JOB") await publicTalentJob(data.targetId);
    else await conversationAccess(userId, data.targetId);
    return {
      report: await prisma.talentReport.create({
        data: { ...data, reporterId: userId },
      }),
    };
  }
  if (area === "admin") {
    await talentAdmin(userId);
    if (method === "GET" && id === "reports" && child) {
      const report = await prisma.talentReport.findUnique({
        where: { id: child },
      });
      assertTalent(report, 404, "Report not found");
      const content =
        report.targetType === "JOB"
          ? await prisma.job.findUnique({
              where: { id: report.targetId },
              select: {
                title: true,
                summary: true,
                responsibilities: true,
                requirements: true,
              },
            })
          : await prisma.talentConversation.findUnique({
              where: { id: report.targetId },
              select: {
                status: true,
                redactedAt: true,
                messages: {
                  select: { body: true, createdAt: true },
                  orderBy: { createdAt: "desc" },
                  take: 50,
                },
              },
            });
      return { report, content };
    }
    if (method === "GET")
      return {
        profiles: await prisma.talentHiringProfile.findMany({
          where: { verification: { in: ["PENDING", "VERIFIED", "SUSPENDED"] } },
          orderBy: { updatedAt: "desc" },
          take: 100,
        }),
        reports: await prisma.talentReport.findMany({
          where: { resolvedAt: null },
          orderBy: { createdAt: "asc" },
          take: 100,
        }),
      };
    if (method === "PATCH" && id === "hiring" && child)
      return { profile: await reviewHiringProfile(userId, child, body) };
    if (method === "PATCH" && id === "reports" && child) {
      const data = z
        .object({
          resolution: z.string().trim().min(10).max(2000),
          closeJob: z.boolean().default(false),
        })
        .strict()
        .parse(body);
      const report = await prisma.talentReport.findUnique({
        where: { id: child },
      });
      assertTalent(report, 404, "Report not found");
      if (data.closeJob && report.targetType === "JOB")
        await prisma.job.update({
          where: { id: report.targetId },
          data: { status: "CLOSED", version: { increment: 1 } },
        });
      await prisma.talentReport.update({
        where: { id: child },
        data: {
          resolution: data.resolution,
          resolvedById: userId,
          resolvedAt: new Date(),
        },
      });
      return { ok: true };
    }
    if (method === "PATCH" && id === "holds" && child) {
      const data = z
        .object({
          retentionHold: z.boolean(),
          holdReason: z.string().trim().min(10).max(2000),
        })
        .strict()
        .parse(body);
      const app = await prisma.jobApplication.findUnique({
        where: { id: child },
      });
      assertTalent(app && !app.redactedAt, 404, "Application not found");
      await prisma.$transaction([
        prisma.jobApplication.update({ where: { id: child }, data }),
        prisma.talentConversation.updateMany({
          where: { jobId: app.jobId, candidateId: app.applicantId },
          data,
        }),
      ]);
      return { ok: true };
    }
  }
  assertTalent(false, 404, "Not found");
}
