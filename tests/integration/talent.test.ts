import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@/lib/db";
import {
  requireTalentTestDatabase,
  talentFixture,
  createTalentUser,
  profileInput,
  jobInput,
  applicationInput,
} from "../helpers/talent";
import { authorizeUser } from "@/lib/authorization";
import { jobAccess } from "@/lib/talent-access";
import {
  viewTalentProfile,
  saveTalentProfile,
  searchTalentProfiles,
} from "@/lib/talent-profiles";
import {
  inviteTalentMember,
  acceptTalentInvitation,
  manageTalentMember,
  reviewHiringProfile,
} from "@/lib/talent-hiring";
import {
  saveTalentJob,
  publicTalentJob,
  searchTalentJobs,
  finishRecruitment,
} from "@/lib/talent-jobs";
import {
  submitTalentApplication,
  applicationView,
  addApplicationNote,
  changeApplicationStatus,
  saveApplicationDraft,
} from "@/lib/talent-applications";
import {
  inviteCandidate,
  answerCandidateInvitation,
  sendTalentMessage,
} from "@/lib/talent-conversations";
import { canReadTalentAsset } from "@/lib/talent-documents";
import { runTalentRetention, exportTalentData } from "@/lib/talent-retention";
import { queueTalentAlerts } from "@/lib/talent-alerts";
import { talentDeliveryAllowed } from "@/lib/talent-notifications";

requireTalentTestDatabase();
test("Talent recruitment, privacy, teams and lifecycle against PostgreSQL", async (t) => {
  const f = await talentFixture();
  try {
    await t.test(
      "new members have no clinical permission and profiles start private",
      async () => {
        assert.equal(
          (
            await authorizeUser(f.candidate.id, "hub.patient.read", {
              ownerId: f.candidate.id,
            })
          ).ok,
          false,
        );
        assert.equal(
          (await authorizeUser(f.candidate.id, "safety.signal.read")).ok,
          false,
        );
        await assert.rejects(
          viewTalentProfile(f.candidate.id),
          /Profile not found/,
        );
        await assert.rejects(
          viewTalentProfile(f.candidate.id, f.owner.id),
          /Profile not found/,
        );
        assert.equal(
          (await viewTalentProfile(f.candidate.id, f.candidate.id)).name,
          "Candidate",
        );
        await saveTalentProfile(
          f.candidate.id,
          profileInput({ visibility: "RECRUITERS" }),
        );
        await viewTalentProfile(f.candidate.id, f.owner.id);
        await assert.rejects(
          viewTalentProfile(f.candidate.id, f.stranger.id),
          /Profile not found/,
        );
        assert.equal(
          (await searchTalentProfiles(undefined, "Public health")).results.some(
            (p) => p.userId === f.candidate.id,
          ),
          false,
        );
      },
    );
    await t.test(
      "invitation email, single use, assignment and revocation boundaries",
      async () => {
        const invitation = await inviteTalentMember(f.owner.id, f.hiring.id, {
          email: f.reviewer.email,
          role: "REVIEWER",
        });
        await assert.rejects(
          acceptTalentInvitation(f.stranger.id, invitation.token),
          /email/,
        );
        const member = await acceptTalentInvitation(
          f.reviewer.id,
          invitation.token,
        );
        await assert.rejects(
          acceptTalentInvitation(f.reviewer.id, invitation.token),
          /no longer/,
        );
        await assert.rejects(
          jobAccess(f.reviewer.id, f.job.id),
          /Job not found/,
        );
        await prisma.talentJobAssignment.create({
          data: { jobId: f.job.id, memberId: member.id },
        });
        await jobAccess(f.reviewer.id, f.job.id);
        await assert.rejects(
          jobAccess(f.reviewer.id, f.job.id, "write"),
          /Reviewers/,
        );
        await assert.rejects(jobAccess(f.stranger.id, f.job.id), /not found/);
        const invite = await inviteTalentMember(f.owner.id, f.hiring.id, {
          email: f.recruiter.email,
          role: "RECRUITER",
        });
        const recruiterMember = await acceptTalentInvitation(
          f.recruiter.id,
          invite.token,
        );
        await prisma.talentJobAssignment.create({
          data: { jobId: f.job.id, memberId: recruiterMember.id },
        });
        await jobAccess(f.recruiter.id, f.job.id, "write");
        await manageTalentMember(f.owner.id, f.hiring.id, recruiterMember.id, {
          action: "REVOKE",
        });
        await assert.rejects(jobAccess(f.recruiter.id, f.job.id), /not found/);
      },
    );
    await t.test(
      "drafts accept pending scans but submissions require clean owned documents",
      async () => {
        const pending = await prisma.uploadAsset.create({
          data: {
            ownerId: f.candidate.id,
            purpose: "TALENT_RESUME",
            status: "QUARANTINED",
            objectKey: `synthetic/${randomUUID()}`,
            originalFileName: "pending.pdf",
            expectedContentType: "application/pdf",
            expectedSize: 100,
          },
        });
        await saveApplicationDraft(
          f.candidate.id,
          f.job.id,
          applicationInput(f.job.version, pending.id),
        );
        await assert.rejects(
          submitTalentApplication(
            f.candidate.id,
            f.job.id,
            applicationInput(f.job.version, pending.id),
          ),
          /security review/,
        );
        await saveTalentProfile(f.stranger.id, profileInput());
        await assert.rejects(
          submitTalentApplication(
            f.stranger.id,
            f.job.id,
            applicationInput(f.job.version, f.cv.id),
          ),
          /security review/,
        );
        await assert.rejects(
          submitTalentApplication(
            f.candidate.id,
            f.job.id,
            applicationInput(f.job.version + 1, f.cv.id),
          ),
          /job changed/,
        );
      },
    );
    let applicationId = "";
    await t.test(
      "racing submissions create one immutable snapshot and a separate private note",
      async () => {
        const attempts = await Promise.allSettled([
          submitTalentApplication(
            f.candidate.id,
            f.job.id,
            applicationInput(f.job.version, f.cv.id),
          ),
          submitTalentApplication(
            f.candidate.id,
            f.job.id,
            applicationInput(f.job.version, f.cv.id),
          ),
        ]);
        assert.equal(
          attempts.filter((result) => result.status === "fulfilled").length,
          1,
        );
        const app = await prisma.jobApplication.findUniqueOrThrow({
          where: {
            jobId_applicantId: { jobId: f.job.id, applicantId: f.candidate.id },
          },
        });
        applicationId = app.id;
        assert.equal(
          await prisma.talentApplicationDraft.count({
            where: { userId: f.candidate.id, jobId: f.job.id },
          }),
          0,
        );
        await saveTalentProfile(
          f.candidate.id,
          profileInput({
            headline: "Updated after submission",
            visibility: "PRIVATE",
          }),
        );
        assert.equal(
          (await applicationView(f.candidate.id, app.id)).snapshot &&
            ((await applicationView(f.candidate.id, app.id)).snapshot as any)
              .profile.headline,
          "Public health professional",
        );
        await addApplicationNote(
          f.reviewer.id,
          app.id,
          "Internal interview consideration",
        );
        assert.equal(
          (await applicationView(f.candidate.id, app.id)).notes,
          undefined,
        );
        assert.equal(
          (await applicationView(f.owner.id, app.id)).notes?.length,
          1,
        );
        await assert.rejects(
          applicationView(f.stranger.id, app.id),
          /not found/,
        );
        assert.equal(await canReadTalentAsset(f.reviewer.id, f.cv.id), true);
        assert.equal(await canReadTalentAsset(f.recruiter.id, f.cv.id), false);
        const exported = await exportTalentData(f.candidate.id);
        assert.equal(
          JSON.stringify(exported).includes("Internal interview consideration"),
          false,
        );
      },
    );
    await t.test(
      "applicant messages are idempotent and blocked teams cannot send",
      async () => {
        const c = await prisma.talentConversation.findUniqueOrThrow({
          where: {
            jobId_candidateId: { jobId: f.job.id, candidateId: f.candidate.id },
          },
        });
        const message = {
          body: "Interview on Monday at 10:00 Nairobi time.",
          clientId: randomUUID(),
        };
        const first = await sendTalentMessage(f.owner.id, c.id, message),
          second = await sendTalentMessage(f.owner.id, c.id, message);
        assert.equal(first.id, second.id);
        await assert.rejects(
          sendTalentMessage(f.reviewer.id, c.id, {
            ...message,
            clientId: randomUUID(),
          }),
          /Reviewers/,
        );
        await prisma.talentBlock.create({
          data: { userId: f.candidate.id, hiringProfileId: f.hiring.id },
        });
        await assert.rejects(
          sendTalentMessage(f.owner.id, c.id, {
            ...message,
            clientId: randomUUID(),
          }),
          /not available/,
        );
        assert.equal(
          await talentDeliveryAllowed(f.candidate.id, {
            resourceType: "conversation",
            resourceId: c.id,
          }),
          false,
        );
        await prisma.talentBlock.delete({
          where: {
            userId_hiringProfileId: {
              userId: f.candidate.id,
              hiringProfileId: f.hiring.id,
            },
          },
        });
      },
    );
    await t.test(
      "recruiter invitations require discovery consent and candidate acceptance",
      async () => {
        await assert.rejects(
          inviteCandidate(f.owner.id, f.job.id, f.stranger.id),
          /not available/,
        );
        await saveTalentProfile(
          f.stranger.id,
          profileInput({ visibility: "RECRUITERS" }),
        );
        const invite = await inviteCandidate(
          f.owner.id,
          f.job.id,
          f.stranger.id,
        );
        await assert.rejects(
          sendTalentMessage(f.owner.id, invite.id, {
            body: "Premature message",
            clientId: randomUUID(),
          }),
          /not available/,
        );
        await answerCandidateInvitation(f.stranger.id, invite.id, true);
        await sendTalentMessage(f.owner.id, invite.id, {
          body: "Thank you for accepting.",
          clientId: randomUUID(),
        });
        await assert.rejects(
          inviteCandidate(f.owner.id, f.job.id, f.stranger.id),
          /already exists/,
        );
      },
    );
    await t.test(
      "pipeline uses permitted transitions and prevents stale decisions",
      async () => {
        await assert.rejects(
          changeApplicationStatus(f.owner.id, applicationId, {
            status: "HIRED",
            expectedStatus: "SUBMITTED",
          }),
          /not available/,
        );
        await changeApplicationStatus(f.owner.id, applicationId, {
          status: "SHORTLISTED",
          expectedStatus: "SUBMITTED",
        });
        await assert.rejects(
          changeApplicationStatus(f.owner.id, applicationId, {
            status: "REJECTED",
            expectedStatus: "SUBMITTED",
          }),
          /changed/,
        );
        await assert.rejects(
          finishRecruitment(f.owner.id, f.job.id),
          /final outcome/,
        );
        await changeApplicationStatus(f.owner.id, applicationId, {
          status: "OFFERED",
          expectedStatus: "SHORTLISTED",
        });
        await changeApplicationStatus(f.owner.id, applicationId, {
          status: "HIRED",
          expectedStatus: "OFFERED",
        });
        const profile = await prisma.talentProfile.findUniqueOrThrow({
          where: { userId: f.candidate.id },
        });
        assert.deepEqual(profile.experiences, []);
      },
    );
    await t.test(
      "withdrawal removes hiring access to application content and documents",
      async () => {
        const role = await saveTalentJob(
          f.owner.id,
          jobInput(f.hiring.id, {
            status: "PUBLISHED",
            title: "Community evaluation consultant",
          }),
        );
        const cv = await prisma.uploadAsset.create({
          data: {
            ownerId: f.stranger.id,
            purpose: "TALENT_RESUME",
            status: "CLEAN",
            objectKey: `synthetic/${randomUUID()}.pdf`,
            originalFileName: "withdrawn.pdf",
            expectedContentType: "application/pdf",
            expectedSize: 100,
            contentValidatedAt: new Date(),
          },
        });
        const application = await submitTalentApplication(
          f.stranger.id,
          role.id,
          applicationInput(role.version, cv.id),
        );
        assert.equal(await canReadTalentAsset(f.owner.id, cv.id), true);
        await changeApplicationStatus(f.stranger.id, application.id, {
          status: "WITHDRAWN",
          expectedStatus: "SUBMITTED",
        });
        const view = await applicationView(f.owner.id, application.id);
        assert.equal(view.snapshot, null);
        assert.equal(view.resumeAssetId, null);
        assert.equal(view.notes, undefined);
        assert.equal(await canReadTalentAsset(f.owner.id, cv.id), false);
        await assert.rejects(
          submitTalentApplication(
            f.stranger.id,
            role.id,
            applicationInput(role.version, cv.id),
          ),
          /already applied/,
        );
        await saveTalentJob(
          f.owner.id,
          jobInput(f.hiring.id, { version: role.version, status: "CLOSED" }),
          role.id,
        );
        await assert.rejects(
          saveTalentJob(
            f.owner.id,
            jobInput(f.hiring.id, { version: role.version }),
            role.id,
          ),
          /changed/,
        );
        await assert.rejects(
          submitTalentApplication(
            f.candidate.id,
            role.id,
            applicationInput(role.version + 1, f.cv.id),
          ),
          /not accepting/,
        );
      },
    );
    await t.test(
      "global search combines country with keywords and deterministic matching",
      async () => {
        const uk = await saveTalentJob(
          f.owner.id,
          jobInput(f.hiring.id, {
            country: "GB",
            location: "London",
            status: "PUBLISHED",
          }),
        );
        const result = await searchTalentJobs(
          { q: "Research", country: "KE", sort: "MATCH" },
          f.candidate.id,
        );
        assert.ok(result.jobs.some((job) => job.id === f.job.id));
        assert.equal(
          result.jobs.some((job) => job.id === uk.id),
          false,
        );
      },
    );
    await t.test(
      "daily alert scan is repeatable and respects paused searches at delivery",
      async () => {
        const now = new Date();
        now.setUTCHours(12, 0, 0, 0);
        const search = await prisma.talentSavedSearch.create({
          data: {
            userId: f.candidate.id,
            name: "Research",
            filters: { q: "Research" },
            alertsEnabled: true,
            createdAt: new Date(now.getTime() - 86400000 * 2),
          },
        });
        await prisma.job.update({
          where: { id: f.job.id },
          data: { publishedAt: new Date(now.getTime() - 3600000) },
        });
        await queueTalentAlerts(now);
        await queueTalentAlerts(now);
        assert.equal(
          await prisma.notificationEvent.count({
            where: {
              idempotencyKey: { startsWith: `talent:digest:${search.id}:` },
            },
          }),
          2,
        );
        await prisma.talentSavedSearch.update({
          where: { id: search.id },
          data: { alertsEnabled: false },
        });
        assert.equal(
          await talentDeliveryAllowed(f.candidate.id, {
            resourceType: "search",
            resourceId: search.id,
          }),
          false,
        );
      },
    );
    await t.test(
      "retention respects holds and saved CV references",
      async () => {
        await finishRecruitment(f.owner.id, f.job.id);
        await assert.rejects(publicTalentJob(f.job.id), /not accepting/);
        await prisma.talentProfile.update({
          where: { userId: f.candidate.id },
          data: { savedResumeAssetId: f.cv.id },
        });
        const future = new Date(Date.now() + 367 * 86400000);
        await prisma.jobApplication.update({
          where: { id: applicationId },
          data: { retentionHold: true, holdReason: "Synthetic hold" },
        });
        await runTalentRetention(true, future);
        assert.equal(
          (
            await prisma.jobApplication.findUniqueOrThrow({
              where: { id: applicationId },
            })
          ).redactedAt,
          null,
        );
        await prisma.jobApplication.update({
          where: { id: applicationId },
          data: { retentionHold: false },
        });
        await runTalentRetention(true, future);
        assert.ok(
          (
            await prisma.jobApplication.findUniqueOrThrow({
              where: { id: applicationId },
            })
          ).redactedAt,
        );
        assert.equal(
          (
            await prisma.uploadAsset.findUniqueOrThrow({
              where: { id: f.cv.id },
            })
          ).status,
          "CLEAN",
        );
        assert.equal(
          await prisma.talentApplicationNote.count({
            where: { applicationId },
          }),
          0,
        );
      },
    );
    await t.test(
      "human suspension removes jobs and recruitment access",
      async () => {
        await reviewHiringProfile(f.admin.id, f.hiring.id, {
          verification: "SUSPENDED",
          note: "Synthetic suspension for regression verification.",
        });
        assert.equal(
          await prisma.job.count({
            where: { hiringProfileId: f.hiring.id, status: "PUBLISHED" },
          }),
          0,
        );
        await assert.rejects(jobAccess(f.owner.id, f.job.id), /suspended/);
      },
    );
  } finally {
    await prisma.$disconnect();
  }
});
