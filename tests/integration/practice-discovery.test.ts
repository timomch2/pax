import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import {
  findPractitioners,
  submitAppointmentInquiry,
  reviewAppointmentInquiry,
} from "@/lib/practice-discovery";
import {
  listPracticeSpecialties,
  proposePracticeSpecialty,
  reviewPracticeSpecialty,
} from "@/lib/practice-specialties";
import { saveServiceProfile } from "@/lib/service-profiles";

const database = new URL(
  process.env.DATABASE_URL || "postgresql://localhost/undefined",
);
assert.equal(database.pathname, "/pax_practice_test");
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
process.env.PRACTICE_WORKSPACE_ENABLED = "true";

test("directory publication, workspace isolation, booking races and specialty review persist in PostgreSQL", async () => {
  const suffix = randomUUID();
  const owner = await prisma.user.create({
    data: {
      name: `Discovery ${suffix}`,
      email: `discovery-${suffix}@example.test`,
      role: "PRACTITIONER",
      tier: "TIER2_PROFESSIONAL",
    },
  });
  const stranger = await prisma.user.create({
    data: {
      name: "Other practitioner",
      email: `other-${suffix}@example.test`,
      role: "PRACTITIONER",
      tier: "TIER2_PROFESSIONAL",
    },
  });
  const admin = await prisma.user.create({
    data: {
      name: "Specialty reviewer",
      email: `reviewer-${suffix}@example.test`,
      role: "ADMIN",
    },
  });
  for (const [userId, key] of [
    [owner.id, "profile.update"],
    [admin.id, "verification.review"],
  ]) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, resource: key.split(".")[0], action: key.split(".")[1] },
    });
    await prisma.userPermission.create({
      data: { userId, permissionId: permission.id, scope: "OWN" },
    });
  }
  const workspace = await prisma.practiceWorkspace.create({
    data: { ownerId: owner.id },
  });
  await prisma.practitionerProfile.create({
    data: {
      userId: owner.id,
      medicalRegNumber: "SYNTHETIC",
      specialty: "General practice",
      directoryEnabled: true,
      practiceCounty: "SyntheticCounty",
    },
  });
  const search = { q: suffix };
  assert.equal(
    (await findPractitioners(search)).practitioners.length,
    0,
    "Professional tier is not licence verification",
  );
  await assert.rejects(
    submitAppointmentInquiry(owner.id, { name: "Client", phone: "0700000000" }),
    /not accepting/,
  );
  await prisma.verificationRequest.create({
    data: {
      userId: owner.id,
      requestedLevel: "IDENTITY_VERIFIED",
      status: "APPROVED",
      documents: {
        create: {
          docType: "PROFESSIONAL_LICENSE",
          fileName: "synthetic.pdf",
          cloudStoragePath: "synthetic-only",
        },
      },
    },
  });
  const publicRow = (await findPractitioners(search)).practitioners[0];
  assert.equal(publicRow.id, owner.id);
  assert.equal("email" in publicRow, false);
  assert.equal("medicalRegNumber" in publicRow, false);
  await prisma.practitionerProfile.update({
    where: { userId: owner.id },
    data: { directoryEnabled: false },
  });
  assert.equal((await findPractitioners(search)).practitioners.length, 0);
  await prisma.practitionerProfile.update({
    where: { userId: owner.id },
    data: { directoryEnabled: true },
  });
  await submitAppointmentInquiry(owner.id, {
    name: "Synthetic new client",
    phone: "0700000000",
  });
  const inquiry = await prisma.practiceAppointmentInquiry.findFirstOrThrow({
    where: { workspaceId: workspace.id },
  });
  assert.equal(
    await prisma.practiceEvent.count({ where: { workspaceId: workspace.id } }),
    0,
    "An inquiry does not reserve the calendar",
  );
  const start = new Date(Date.now() + 86400000),
    end = new Date(start.getTime() + 1800000);
  const review = {
    id: inquiry.id,
    version: 1,
    action: "APPROVE",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    feeMinor: 250000,
    reviewReason: "Synthetic client contacted and time agreed",
  };
  await assert.rejects(
    reviewAppointmentInquiry(stranger.id, workspace.id, review),
    /not found/,
  );
  const raced = await Promise.allSettled([
    reviewAppointmentInquiry(owner.id, workspace.id, review),
    reviewAppointmentInquiry(owner.id, workspace.id, review),
  ]);
  assert.equal(raced.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    await prisma.practiceEvent.count({ where: { workspaceId: workspace.id } }),
    1,
  );
  assert.equal(
    await prisma.hubPatient.count({ where: { practitionerId: owner.id } }),
    1,
  );
  assert.equal(
    (
      await prisma.practiceAppointmentInquiry.findUniqueOrThrow({
        where: { id: inquiry.id },
      })
    ).status,
    "APPROVED",
  );
  await submitAppointmentInquiry(owner.id, {
    name: "Synthetic different client",
    phone: "0711111111",
  });
  const clash = await prisma.practiceAppointmentInquiry.findFirstOrThrow({
    where: { workspaceId: workspace.id, status: "PENDING" },
  });
  await assert.rejects(
    reviewAppointmentInquiry(owner.id, workspace.id, {
      ...review,
      id: clash.id,
    }),
    /overlaps/,
  );
  await reviewAppointmentInquiry(owner.id, workspace.id, {
    id: clash.id,
    version: 1,
    action: "DECLINE",
    reviewReason: "Agreed time unavailable",
  });
  const proposal = await proposePracticeSpecialty(owner.id, {
    parentId: "practice-specialty-surgery",
    name: `Synthetic subspecialty ${suffix}`,
  });
  assert.ok(
    !(await listPracticeSpecialties()).some((s) => s.id === proposal.id),
  );
  assert.ok(
    (await listPracticeSpecialties(owner.id)).some((s) => s.id === proposal.id),
  );
  await assert.rejects(
    reviewPracticeSpecialty(owner.id, {
      id: proposal.id,
      status: "APPROVED",
      notes: "Self approval attempt",
    }),
    /Forbidden/,
  );
  await reviewPracticeSpecialty(admin.id, {
    id: proposal.id,
    status: "APPROVED",
    notes: "Synthetic reviewed specialty",
  });
  await assert.rejects(
    reviewPracticeSpecialty(admin.id, {
      id: proposal.id,
      status: "REJECTED",
      notes: "Cannot overwrite the completed review",
    }),
    /already been reviewed/,
  );
  assert.ok(
    (await listPracticeSpecialties()).some((s) => s.id === proposal.id),
  );
  assert.equal(
    (
      await prisma.practitionerProfile.findUniqueOrThrow({
        where: { userId: owner.id },
      })
    ).specialtyId,
    proposal.id,
  );
  await assert.rejects(
    saveServiceProfile(owner.id, "practice", {
      specialty: "Mismatch",
      hospital: "",
      bio: "",
      affiliations: "",
      consultationRate: 0,
      specialtyGroupId: "practice-specialty-gp",
      specialtyId: proposal.id,
    }),
    /selected group/,
  );
  await prisma.user.update({
    where: { id: owner.id },
    data: { accountStatus: "SUSPENDED" },
  });
  assert.equal((await findPractitioners(search)).practitioners.length, 0);
  await assert.rejects(
    submitAppointmentInquiry(owner.id, { name: "Client", phone: "0700000000" }),
    /not accepting/,
  );
});
test.after(async () => {
  await prisma.$disconnect();
});
