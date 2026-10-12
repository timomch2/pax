import { z } from "zod";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authorizePracticeUser } from "@/lib/authorization";
import { assertPractice } from "@/lib/practice-policy";
import { practiceTransaction, lockPractice } from "@/lib/practice-db";
import { assertCalendarAvailable } from "@/lib/practice-calendar-service";

export const directoryQuerySchema = z
  .object({
    q: z.string().trim().max(120).default(""),
    specialty: z.string().max(100).default(""),
    county: z.string().trim().max(120).default(""),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine(
    (v) => (v.latitude === undefined) === (v.longitude === undefined),
    "Provide both coordinates",
  );
export const appointmentInquirySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(40),
    email: z.string().trim().email().max(254).nullable().default(null),
    clientCode: z.string().trim().max(40).nullable().default(null),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
    reason: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

/** Haversine distance, calculated only for coordinates explicitly published by the practitioner. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (v: number) => (v * Math.PI) / 180;
  const x =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}

/** Membership, reviewed licence evidence and public opt-in are independent requirements. */
export function directoryEligibilityWhere(): Prisma.PractitionerProfileWhereInput {
  return {
    directoryEnabled: true,
    user: {
      accountStatus: "ACTIVE",
      tier: { in: ["TIER2_PROFESSIONAL", "TIER3_EXPERT"] },
      OR: [
        { role: "PRACTITIONER" },
        { additionalRoles: { has: "PRACTITIONER" } },
      ],
      verificationRequests: {
        some: {
          status: "APPROVED",
          documents: { some: { docType: "PROFESSIONAL_LICENSE" } },
        },
      },
      practiceWorkspace: { isNot: null },
    },
  };
}

/** Never serialize shared account contact details, clinical data, documents or licence identifiers. */
export async function findPractitioners(raw: unknown) {
  assertPractice(
    process.env.PRACTICE_WORKSPACE_ENABLED === "true",
    404,
    "Practitioner directory is not available",
  );
  const query = directoryQuerySchema.parse(raw);
  const profiles = await prisma.practitionerProfile.findMany({
    where: {
      ...directoryEligibilityWhere(),
      ...(query.county
        ? { practiceCounty: { equals: query.county, mode: "insensitive" } }
        : {}),
      ...(query.specialty
        ? {
            OR: [
              { specialtyId: query.specialty },
              { specialtyGroupId: query.specialty },
            ],
          }
        : {}),
      ...(query.q
        ? {
            AND: [
              {
                OR: [
                  { hospital: { contains: query.q, mode: "insensitive" } },
                  {
                    user: { name: { contains: query.q, mode: "insensitive" } },
                  },
                ],
              },
            ],
          }
        : {}),
    },
    select: {
      userId: true,
      specialty: true,
      hospital: true,
      bio: true,
      consultationRate: true,
      practiceAddress: true,
      practiceTown: true,
      practiceCounty: true,
      latitude: true,
      longitude: true,
      user: { select: { name: true } },
    },
    orderBy: { userId: "asc" },
    take: 501,
  });
  const results = profiles
    .slice(0, 500)
    .map((p) => ({
      id: p.userId,
      name: p.user.name,
      specialty: p.specialty,
      clinic: p.hospital,
      bio: p.bio,
      consultationRate: p.consultationRate,
      address: p.practiceAddress,
      town: p.practiceTown,
      county: p.practiceCounty,
      distance:
        query.latitude !== undefined &&
        query.longitude !== undefined &&
        p.latitude !== null &&
        p.longitude !== null
          ? Math.round(
              distanceKm(
                { latitude: query.latitude, longitude: query.longitude },
                { latitude: p.latitude, longitude: p.longitude },
              ) * 10,
            ) / 10
          : null,
    }));
  if (query.latitude !== undefined)
    results.sort(
      (a, b) =>
        (a.distance ?? Infinity) - (b.distance ?? Infinity) ||
        a.name.localeCompare(b.name, "en"),
    );
  else results.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return { practitioners: results, truncated: profiles.length > 500 };
}

/** A phone inquiry does not authenticate a client or reserve a calendar slot. */
export async function submitAppointmentInquiry(
  practitionerId: string,
  raw: unknown,
) {
  const body = appointmentInquirySchema.parse(raw);
  if (body.preferredDate) {
    const d = new Date(`${body.preferredDate}T12:00:00+03:00`);
    assertPractice(
      Number.isFinite(d.getTime()) &&
        new Date(d.getTime() + 10800000).toISOString().slice(0, 10) ===
          body.preferredDate &&
        d.getTime() >= Date.now() - 86400000 &&
        d.getTime() <= Date.now() + 90 * 86400000,
      400,
      "Choose a valid date within the next 90 days",
    );
  }
  return practiceTransaction(async (tx) => {
    assertPractice(
      process.env.PRACTICE_WORKSPACE_ENABLED === "true",
      404,
      "Requests unavailable",
    );
    const profile = await tx.practitionerProfile.findFirst({
      where: { userId: practitionerId, ...directoryEligibilityWhere() },
      select: {
        user: { select: { practiceWorkspace: { select: { id: true } } } },
      },
    });
    assertPractice(
      profile?.user.practiceWorkspace,
      404,
      "This practitioner is not accepting requests",
    );
    const workspaceId = profile.user.practiceWorkspace.id;
    await lockPractice(tx, workspaceId);
    assertPractice(
      (await tx.practiceAppointmentInquiry.count({
        where: { workspaceId, status: "PENDING" },
      })) < 1000,
      429,
      "Please contact this practice directly",
    );
    await tx.practiceAppointmentInquiry.create({
      data: { ...body, email: body.email?.toLowerCase(), workspaceId },
    });
    return {
      status: "PENDING",
      message:
        "Your request has been received. The practice will contact you to confirm a time. No appointment is reserved yet.",
    };
  });
}

/** Review uses the existing workspace permissions, calendar lock and owner-scoped client records. */
export async function reviewAppointmentInquiry(
  actorId: string,
  workspaceId: string,
  raw: unknown,
) {
  const body = z
    .object({
      id: z.string().cuid(),
      version: z.number().int().positive(),
      action: z.enum(["APPROVE", "DECLINE"]),
      startsAt: z.string().datetime({ offset: true }).optional(),
      endsAt: z.string().datetime({ offset: true }).optional(),
      feeMinor: z.number().int().min(0).max(2000000000).default(0),
      patientId: z.string().cuid().nullable().default(null),
      distinctClientReason: z.string().trim().min(5).max(1000).optional(),
      reviewReason: z.string().trim().min(5).max(1000),
    })
    .strict()
    .parse(raw);
  return practiceTransaction(async (tx) => {
    await lockPractice(tx, workspaceId);
    const auth = await authorizePracticeUser(
      actorId,
      workspaceId,
      "booking.manage",
      tx,
    );
    const inquiry = await tx.practiceAppointmentInquiry.findFirst({
      where: { id: body.id, workspaceId },
    });
    assertPractice(
      inquiry?.status === "PENDING" && inquiry.version === body.version,
      409,
      "Request changed. Refresh before reviewing.",
    );
    let eventId: string | undefined;
    if (body.action === "APPROVE") {
      assertPractice(
        body.startsAt && body.endsAt,
        400,
        "Agree a start and end time with the client",
      );
      const startsAt = new Date(body.startsAt),
        endsAt = new Date(body.endsAt);
      assertPractice(
        startsAt > new Date() &&
          endsAt > startsAt &&
          endsAt.getTime() - startsAt.getTime() <= 240 * 60000,
        400,
        "Choose a future appointment lasting at most four hours",
      );
      await assertCalendarAvailable(
        tx,
        workspaceId,
        auth.ownerId,
        [{ startsAt, endsAt }],
        [],
        null,
        false,
      );
      let patientId = body.patientId;
      if (patientId)
        assertPractice(
          await tx.hubPatient.findFirst({
            where: { id: patientId, practitionerId: auth.ownerId },
          }),
          404,
          "Client not found",
        );
      else {
        const matches = await tx.hubPatient.findMany({
          where: {
            practitionerId: auth.ownerId,
            OR: [
              { phone: inquiry.phone },
              { name: { equals: inquiry.name, mode: "insensitive" } },
              ...(inquiry.clientCode
                ? [{ patientCode: inquiry.clientCode }]
                : []),
              ...(inquiry.email ? [{ email: inquiry.email }] : []),
            ],
          },
          select: { id: true, name: true, patientCode: true },
          take: 10,
        });
        if (matches.length && !body.distinctClientReason)
          return { requiresClientReview: true, matches };
        const client = await tx.hubPatient.create({
          data: {
            practitionerId: auth.ownerId,
            name: inquiry.name,
            phone: inquiry.phone,
            email: inquiry.email,
            patientCode: `PAX-P-${randomBytes(6).toString("hex").toUpperCase()}`,
            remindersEnabled: false,
          },
        });
        patientId = client.id;
      }
      const profile = await tx.practitionerProfile.findUnique({
        where: { userId: auth.ownerId },
      });
      const event = await tx.practiceEvent.create({
        data: {
          workspaceId,
          kind: "APPOINTMENT",
          title: "Consultation",
          serviceCode: "Consultation",
          startsAt,
          endsAt,
          patientId,
          location: profile?.hospital || profile?.practiceTown,
          billable: body.feeMinor > 0,
          feeMinor: body.feeMinor,
          createdById: actorId,
          rateSnapshot: { source: "DIRECTORY_INQUIRY" },
        },
      });
      eventId = event.id;
    }
    await tx.practiceAppointmentInquiry.update({
      where: { id: inquiry.id },
      data: {
        status: body.action === "APPROVE" ? "APPROVED" : "DECLINED",
        reviewReason: body.reviewReason,
        eventId,
        version: { increment: 1 },
      },
    });
    await tx.practiceAuditEvent.create({
      data: {
        workspaceId,
        actorId,
        action: `DIRECTORY_INQUIRY_${body.action}`,
        entityId: inquiry.id,
        context: {
          reviewReason: body.reviewReason,
          distinctClientReason: body.distinctClientReason ?? null,
        },
      },
    });
    return { ok: true, eventId };
  });
}
