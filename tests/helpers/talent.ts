import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { seedTalentFoundation } from "@/lib/talent-seed";
import { saveTalentProfile } from "@/lib/talent-profiles";
import {
  saveHiringProfile,
  submitHiringVerification,
  reviewHiringProfile,
} from "@/lib/talent-hiring";
import { saveTalentJob } from "@/lib/talent-jobs";

export function requireTalentTestDatabase() {
  const url = new URL(
    process.env.DATABASE_URL || "postgresql://localhost/undefined",
  );
  assert.equal(url.pathname, "/pax_talent_test");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  process.env.TALENT_ENABLED = "true";
}
export const profileInput = (override: Record<string, unknown> = {}) => ({
  headline: "Public health professional",
  about: "Health systems and research experience.",
  location: "Nairobi",
  country: "KE",
  specialty: "Public health",
  skills: ["Research", "Data analysis"],
  languages: ["English"],
  interests: ["Health systems"],
  experiences: [],
  education: [],
  credentials: [],
  preferredTypes: ["FULL_TIME"],
  preferredModes: ["REMOTE", "ONSITE"],
  preferredCountries: ["KE"],
  yearsExperience: 4,
  availability: "Open to roles",
  visibility: "PRIVATE",
  sharedGpsIds: [],
  avatarAssetId: null,
  savedResumeAssetId: null,
  adultConfirmed: true,
  ...override,
});
export const jobInput = (
  hiringProfileId: string,
  override: Record<string, unknown> = {},
) => ({
  hiringProfileId,
  title: "Public Health Research Officer",
  summary: "Support evidence-based public health research and evaluation.",
  responsibilities:
    "Conduct research, work with partners, and report findings clearly.",
  requirements:
    "Public health research experience and clear communication skills.",
  healthAreas: ["Health Systems"],
  requiredSkills: ["Research"],
  desirableSkills: ["Data analysis"],
  specialty: "Public health",
  minimumYears: 2,
  remoteCountries: [],
  employmentType: "FULL_TIME",
  workMode: "ONSITE",
  location: "Nairobi",
  country: "KE",
  salaryMinMinor: null,
  salaryMaxMinor: null,
  salaryCurrency: null,
  salaryPeriod: null,
  closesAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  status: "DRAFT",
  applicationConfig: {
    cv: "REQUIRED",
    coverLetter: "OPTIONAL",
    documents: "OPTIONAL",
    questions: [],
  },
  ...override,
});
export const applicationInput = (
  version: number,
  resumeAssetId: string | null,
  override: Record<string, unknown> = {},
) => ({
  jobVersion: version,
  resumeAssetId,
  coverLetter: "My public health experience is relevant to this role.",
  coverLetterAssetId: null,
  documentAssetIds: [],
  answers: {},
  sharedGpsIds: [],
  consent: true,
  ...override,
});
export async function createTalentUser(
  label: string,
  role: UserRole = "MEMBER",
) {
  const accessRole = await prisma.accessRole.findUniqueOrThrow({
    where: { key: "MEMBER" },
  });
  return prisma.user.create({
    data: {
      name: label,
      email: `${label.replace(/[^a-z]/gi, "").toLowerCase()}-${randomUUID()}@example.test`,
      role,
      emailVerified: new Date(),
      accessRoleAssignments: {
        create: { accessRoleId: accessRole.id, scope: "OWN" },
      },
    },
  });
}
export async function talentFixture() {
  await seedTalentFoundation();
  const owner = await createTalentUser("Hiring Owner"),
    candidate = await createTalentUser("Candidate"),
    stranger = await createTalentUser("Unrelated Member"),
    reviewer = await createTalentUser("Reviewer"),
    recruiter = await createTalentUser("Recruiter"),
    admin = await createTalentUser("Administrator", "ADMIN");
  const permission = await prisma.permission.upsert({
    where: { key: "admin.system.manage" },
    create: {
      key: "admin.system.manage",
      resource: "admin.system",
      action: "manage",
    },
    update: {},
  });
  await prisma.userPermission.create({
    data: {
      userId: admin.id,
      permissionId: permission.id,
      effect: "ALLOW",
      scope: "ALL",
    },
  });
  await saveTalentProfile(candidate.id, profileInput());
  const hiring = await saveHiringProfile(owner.id, {
    kind: "ORGANIZATION",
    name: `Research Institute ${randomUUID().slice(0, 8)}`,
    description: "A health research organization.",
    website: "https://example.test",
    country: "KE",
    location: "Nairobi",
    logoAssetId: null,
    verificationStatement:
      "I am the authorized recruitment lead for this research organization.",
    verificationAssetIds: [],
  });
  await submitHiringVerification(owner.id, hiring.id);
  await reviewHiringProfile(admin.id, hiring.id, {
    verification: "VERIFIED",
    note: "Synthetic organization authority checked in the isolated test database.",
  });
  const job = await saveTalentJob(
    owner.id,
    jobInput(hiring.id, { status: "PUBLISHED" }),
  );
  const cv = await prisma.uploadAsset.create({
    data: {
      id: randomUUID(),
      ownerId: candidate.id,
      purpose: "TALENT_RESUME",
      status: "CLEAN",
      objectKey: `synthetic/${randomUUID()}.pdf`,
      originalFileName: "synthetic-cv.pdf",
      expectedContentType: "application/pdf",
      expectedSize: 100,
      contentValidatedAt: new Date(),
    },
  });
  return {
    owner,
    candidate,
    stranger,
    reviewer,
    recruiter,
    admin,
    hiring,
    job,
    cv,
  };
}
