import { completeAccountOnboarding } from "@/lib/account-onboarding";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST as signup } from "@/app/api/signup/route";
import { POST as verify } from "@/app/api/auth/verify-email/route";
import { saveServiceSetup } from "@/lib/service-onboarding";
import {
  readAccountServices,
  setServiceEnrollment,
} from "@/lib/service-enrollment";
import { SERVICE_SETUP_PERMISSIONS } from "@/lib/service-setup-policy";
import { PERMISSIONS } from "@/lib/permissions";
import { seedTalentFoundation } from "@/lib/talent-seed";
import { saveTalentProfile, viewTalentProfile } from "@/lib/talent-profiles";
import { authorizeUser } from "@/lib/authorization";
import { practiceMembershipActive } from "@/lib/practice-policy";
import {
  requireTalentTestDatabase,
  profileInput,
  createTalentUser,
} from "../helpers/talent";
import { authOptions } from "@/lib/auth";

requireTalentTestDatabase();
process.env.PRACTICE_WORKSPACE_ENABLED = "true";
const request = (path: string, data: unknown) =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(data),
  });

test("registration, captured verification, seven service intakes, resume and isolation", async () => {
  await seedTalentFoundation();
  for (const key of new Set(Object.values(SERVICE_SETUP_PERMISSIONS).flat())) {
    const p = PERMISSIONS.find((p) => p[0] === key)!;
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, resource: p[1], action: p[2] },
    });
  }
  await prisma.notificationTemplate.upsert({
    where: {
      slug_channel_locale_version: {
        slug: "account.email-verification",
        channel: "EMAIL",
        locale: "en",
        version: 1,
      },
    },
    update: {},
    create: {
      slug: "account.email-verification",
      channel: "EMAIL",
      locale: "en",
      version: 1,
      subject: "Verify account",
      body: "{{verificationUrl}}",
      requiredVariables: ["name", "expiresMinutes", "verificationUrl"],
    },
  });
  const email = `onboarding-${randomUUID()}@example.test`;
  const input = {
    name: "Synthetic Onboarding Member",
    email,
    phone: "+254700000000",
    country: "Kenya",
    password: "Synthetic-Only-2026",
    serviceKeys: [
      "practice",
      "talent",
      "market",
      "community",
      "innovation",
      "investment",
      "safety",
    ],
    consentGiven: true,
  };
  assert.equal(
    (await signup(request("/api/signup", { ...input, role: "ADMIN" }))).status,
    400,
  );
  assert.equal((await signup(request("/api/signup", input))).status, 202);
  assert.equal((await signup(request("/api/signup", input))).status, 202);
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: {
      services: true,
      consentRecords: true,
      practitionerProfile: true,
    },
  });
  assert.equal(user.role, "MEMBER");
  assert.deepEqual(user.additionalRoles, []);
  assert.equal(user.emailVerified, null);
  assert.equal(user.practitionerProfile, null);
  assert.equal(user.services.length, 7);
  assert.equal(user.consentRecords.length, 2);
  assert.equal(
    await prisma.userServiceEvent.count({
      where: { userService: { userId: user.id } },
    }),
    7,
  );
  await assert.rejects(
    saveServiceSetup(user.id, "practice", { action: "begin" }),
    /verify your account/,
  );
  const event = await prisma.notificationEvent.findFirstOrThrow({
    where: { userId: user.id, templateSlug: "account.email-verification" },
    include: { deliveries: true },
  });
  assert.equal(event.deliveries.length, 1);
  const token = new URL(
    (event.variables as { verificationUrl: string }).verificationUrl,
  ).searchParams.get("token");
  assert.equal(
    (await verify(request("/api/auth/verify-email", { token }))).status,
    200,
  );
  assert.equal(
    (await verify(request("/api/auth/verify-email", { token }))).status,
    400,
  );
  const stranger = await createTalentUser("Onboarding stranger");
  assert.equal((await authorizeUser(user.id, "innovation.create")).ok, false);
  await saveServiceSetup(user.id, "practice", { action: "begin" });
  await assert.rejects(
    saveServiceSetup(user.id, "practice", {
      action: "complete",
      data: { medicalRegNumber: "", specialty: "Nurse" },
    }),
  );
  assert.equal(
    await prisma.practitionerProfile.count({ where: { userId: user.id } }),
    0,
  );
  await saveServiceSetup(user.id, "practice", {
    action: "complete",
    data: {
      medicalRegNumber: "SYNTHETIC-ONLY",
      specialty: "Nursing",
      hospital: "",
      bio: "",
      affiliations: "",
      consultationRate: 0,
    },
  });
  const practiceUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });
  assert.equal(practiceMembershipActive(practiceUser), false);
  assert.equal(practiceUser.tier, "TIER1_BASIC");
  assert.equal(practiceUser.hubMember, false);
  assert.equal(
    (await authorizeUser(user.id, "hub.patient.read", { ownerId: stranger.id }))
      .ok,
    false,
  );
  await saveServiceSetup(user.id, "community", {
    action: "complete",
    data: {
      headline: "Contributor",
      organization: "",
      location: "",
      healthAreas: "",
      bio: "",
      linkedinUrl: "",
    },
  });
  assert.equal(
    (
      await prisma.practitionerProfile.findUniqueOrThrow({
        where: { userId: user.id },
      })
    ).bio,
    "",
  );
  await saveServiceSetup(user.id, "talent", {
    action: "begin",
    choice: "career",
  });
  await saveTalentProfile(
    user.id,
    profileInput({
      participantCategories: ["CHW", "STUDENT"],
      personalVision: "Health for all",
    }),
  );
  assert.equal(
    (await readAccountServices(user.id)).find((s) => s.id === "talent")
      ?.setupStatus,
    "IN_PROGRESS",
  );
  await assert.rejects(viewTalentProfile(user.id, stranger.id), /not found/);
  await saveServiceSetup(user.id, "talent", { action: "complete" });
  assert.equal(
    (
      await prisma.talentProfile.findUniqueOrThrow({
        where: { userId: user.id },
      })
    ).visibility,
    "PRIVATE",
  );
  await saveServiceSetup(user.id, "market", {
    action: "begin",
    choice: "browse",
  });
  await saveServiceSetup(user.id, "market", { action: "complete" });
  assert.equal(
    await prisma.marketplaceVendor.count({ where: { userId: user.id } }),
    0,
  );
  await saveServiceSetup(user.id, "innovation", { action: "begin" });
  const innovation = {
    title: "Synthetic idea",
    sector: "Health Systems",
    summary: "Synthetic research",
    stage: "IDEA",
    problem: "Gap",
    solution: "Proposed approach",
    evidence: "Early research",
    selfAssessmentCompleted: true,
    selfAssessmentData: JSON.stringify({
      declarationAccepted: true,
      leadAuthority: "PASS",
      ipProtectionLevel: "PRE_PATENT",
    }),
    submit: false,
  };
  await assert.rejects(
    saveServiceSetup(user.id, "innovation", {
      action: "complete",
      data: { ...innovation, selfAssessmentCompleted: false },
    }),
  );
  await saveServiceSetup(user.id, "innovation", {
    action: "complete",
    data: innovation,
  });
  await saveServiceSetup(user.id, "innovation", {
    action: "complete",
    data: innovation,
  });
  assert.equal(
    await prisma.innovation.count({ where: { ownerId: user.id } }),
    1,
  );
  const draft = await prisma.innovation.findFirstOrThrow({
    where: { ownerId: user.id },
  });
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.ipHash, null);
  const mandate = {
    geographies: [],
    sectors: [],
    stages: [],
    ticketMinUsd: 100,
    ticketMaxUsd: 1000,
    notes: "",
    notifyOnMatch: true,
    active: true,
  };
  await assert.rejects(
    saveServiceSetup(user.id, "investment", {
      action: "complete",
      data: { manifestoAccepted: false, mandate },
    }),
  );
  await saveServiceSetup(user.id, "investment", {
    action: "complete",
    data: { manifestoAccepted: true, mandate },
  });
  assert.ok(
    (
      await prisma.investorMandate.findUniqueOrThrow({
        where: { userId: user.id },
      })
    ).ethicalManifestoAcceptedAt,
  );
  await saveServiceSetup(user.id, "safety", { action: "complete" });
  assert.equal((await authorizeUser(user.id, "safety.report.create")).ok, true);
  assert.equal((await authorizeUser(user.id, "safety.signal.read")).ok, false);
  assert.equal(
    (await readAccountServices(user.id)).every(
      (s) => s.setupStatus === "COMPLETE",
    ),
    true,
  );
  await setServiceEnrollment(user.id, "innovation", false);
  assert.equal((await authorizeUser(user.id, "innovation.create")).ok, true);
  await assert.rejects(
    saveServiceSetup(user.id, "innovation", { action: "begin" }),
    /Enable this service/,
  );
  assert.equal(
    (await readAccountServices(user.id)).find((s) => s.id === "innovation")
      ?.state,
    "DISABLED",
  );
  assert.equal(
    await prisma.auditLog.count({
      where: { userId: user.id, action: "SERVICE_SETUP_COMPLETED" },
    }),
    7,
  );
  assert.equal(
    await prisma.practitionerProfile.count({ where: { userId: stranger.id } }),
    0,
  );
  await prisma.user.update({
    where: { id: user.id },
    data: { accountStatus: "SUSPENDED" },
  });
  await assert.rejects(
    saveServiceSetup(user.id, "safety", { action: "complete" }),
    /verify your account/,
  );
  assert.equal(
    (await readAccountServices(user.id)).every(
      (s) => s.access === "ACCOUNT_RESTRICTED",
    ),
    true,
  );
});

test("Google trusted verification and new adapter accounts are neutral; returning accounts stay grandfathered", async () => {
  const signIn = authOptions.callbacks!.signIn!;
  assert.equal(
    await signIn({
      user: { id: "synthetic", role: "MEMBER" },
      account: {
        provider: "google",
        type: "oauth",
        providerAccountId: "synthetic",
      },
      profile: { email_verified: false },
    } as Parameters<typeof signIn>[0]),
    false,
  );
  assert.equal(
    await signIn({
      user: { id: "synthetic", role: "MEMBER" },
      account: {
        provider: "google",
        type: "oauth",
        providerAccountId: "synthetic",
      },
      profile: { email_verified: true },
    } as Parameters<typeof signIn>[0]),
    true,
  );
  const google = await authOptions.adapter!.createUser!({
    name: "Synthetic Google",
    email: `google-${randomUUID()}@example.test`,
    emailVerified: null,
  });
  const jwt = authOptions.callbacks!.jwt!;
  const token = await jwt({
    token: { id: "", role: "MEMBER" },
    user: google,
    account: {
      provider: "google",
      type: "oauth",
      providerAccountId: "synthetic",
    },
    profile: { email_verified: true },
  } as Parameters<typeof jwt>[0]);
  assert.equal(token.accountOnboardingPending, true);
  const saved = await prisma.user.findUniqueOrThrow({
    where: { id: google.id },
  });
  assert.equal(saved.role, "MEMBER");
  assert.ok(saved.emailVerified);
  assert.equal(saved.accountOnboardingCompletedAt, null);
  const old = await createTalentUser("Returning Google");
  const returning = await jwt({
    token: { id: "", role: "MEMBER" },
    user: old,
    account: {
      provider: "google",
      type: "oauth",
      providerAccountId: "synthetic",
    },
    profile: { email_verified: true },
  } as Parameters<typeof jwt>[0]);
  assert.equal(returning.accountOnboardingPending, false);
  assert.equal(returning.accountWelcomePending, false);
});

test("Google completion is atomic, repeat-safe and does not change existing service preferences", async () => {
  const account = await authOptions.adapter!.createUser!({
    name: "Synthetic completion",
    email: `complete-${randomUUID()}@example.test`,
    emailVerified: new Date(),
  });
  const details = {
    name: "Synthetic completion",
    phone: "+254700000000",
    country: "Kenya",
    serviceKeys: ["talent", "safety"],
    consentGiven: true,
  };
  const req = request("/api/account/onboarding", details);
  assert.deepEqual(
    await Promise.all([
      completeAccountOnboarding(account.id, details, req),
      completeAccountOnboarding(account.id, details, req),
    ]),
    [200, 200],
  );
  assert.equal(
    await prisma.consentRecord.count({ where: { userId: account.id } }),
    2,
  );
  assert.equal(
    await prisma.userService.count({ where: { userId: account.id } }),
    2,
  );
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).role,
    "MEMBER",
  );
  await setServiceEnrollment(account.id, "talent", false);
  assert.equal(await completeAccountOnboarding(account.id, details, req), 200);
  assert.equal(
    (
      await prisma.userService.findUniqueOrThrow({
        where: {
          userId_serviceKey: { userId: account.id, serviceKey: "talent" },
        },
      })
    ).state,
    "DISABLED",
  );
  await assert.rejects(
    completeAccountOnboarding(account.id, { ...details, userId: "other" }, req),
  );
});

test("denied access rolls back profile and role grants together", async () => {
  const member = await createTalentUser("Denied onboarding");
  await setServiceEnrollment(member.id, "practice", true);
  const permission = await prisma.permission.findUniqueOrThrow({
    where: { key: "hub.patient.create" },
  });
  await prisma.userPermission.create({
    data: {
      userId: member.id,
      permissionId: permission.id,
      effect: "DENY",
      scope: "OWN",
    },
  });
  await assert.rejects(
    saveServiceSetup(member.id, "practice", {
      action: "complete",
      data: {
        medicalRegNumber: "TEST",
        specialty: "Test clinician",
        hospital: "",
        bio: "",
        affiliations: "",
        consultationRate: 0,
      },
    }),
    /access restriction/,
  );
  assert.equal(
    await prisma.practitionerProfile.count({ where: { userId: member.id } }),
    0,
  );
  assert.deepEqual(
    (await prisma.user.findUniqueOrThrow({ where: { id: member.id } }))
      .additionalRoles,
    [],
  );
  assert.equal(
    (
      await prisma.userService.findUniqueOrThrow({
        where: {
          userId_serviceKey: { userId: member.id, serviceKey: "practice" },
        },
      })
    ).setupCompletedAt,
    null,
  );
});
