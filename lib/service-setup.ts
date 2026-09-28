import { Prisma, ServiceKey } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  SERVICE_SETUP_PERMISSIONS,
  SETUP_ROLE,
} from "@/lib/service-setup-policy";
import {
  ServiceEnrollmentError,
  readAccountServices,
} from "@/lib/service-enrollment";
import { productUrl, talentEnabled } from "@/lib/product-hosts";
import { redirect } from "next/navigation";

type Tx = Prisma.TransactionClient;
export async function setupActor(
  tx: Tx,
  userId: string,
  serviceKey: ServiceKey,
) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    !user.emailVerified ||
    (user.registrationVersion === 1 && !user.accountOnboardingCompletedAt)
  )
    throw new ServiceEnrollmentError(
      403,
      "Complete and verify your account first",
    );
  if (
    (serviceKey === "practice" &&
      process.env.PRACTICE_WORKSPACE_ENABLED !== "true") ||
    (serviceKey === "talent" && !talentEnabled())
  )
    throw new ServiceEnrollmentError(
      403,
      "This service is not currently available",
    );
  const enrollment = await tx.userService.findUnique({
    where: { userId_serviceKey: { userId, serviceKey } },
  });
  if (enrollment?.state !== "ENABLED")
    throw new ServiceEnrollmentError(
      403,
      "Enable this service in Accounts first",
    );
  return { user, enrollment };
}

/** Never overwrite direct denials or grant from user-supplied permission names. */
export async function completeServiceSetup(
  tx: Tx,
  userId: string,
  serviceKey: ServiceKey,
) {
  const { user, enrollment } = await setupActor(tx, userId, serviceKey);
  if (enrollment.setupCompletedAt) return;
  const keys = SERVICE_SETUP_PERMISSIONS[serviceKey];
  const permissions = await tx.permission.findMany({
    where: { key: { in: [...keys] } },
  });
  if (permissions.length !== keys.length)
    throw new ServiceEnrollmentError(
      503,
      "Service permissions are not configured",
    );
  const denial = await tx.userPermission.findFirst({
    where: {
      userId,
      permissionId: { in: permissions.map((p) => p.id) },
      effect: "DENY",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (denial)
    throw new ServiceEnrollmentError(
      403,
      "Your account has an access restriction. Contact support.",
    );
  const roleKey = `SERVICE_${serviceKey.toUpperCase()}`;
  const accessRole = await tx.accessRole.upsert({
    where: { key: roleKey },
    update: {},
    create: {
      key: roleKey,
      name: `${serviceKey} member`,
      isSystem: true,
      permissions: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
          scope: "OWN" as const,
        })),
      },
    },
  });
  if (!accessRole.active)
    throw new ServiceEnrollmentError(403, "Service activation is unavailable");
  const assignment = await tx.userAccessRole.findUnique({
    where: { userId_accessRoleId: { userId, accessRoleId: accessRole.id } },
  });
  if (
    assignment &&
    (assignment.startsAt > new Date() ||
      (assignment.endsAt && assignment.endsAt <= new Date()))
  )
    throw new ServiceEnrollmentError(
      403,
      "Your service access requires review. Contact support.",
    );
  await tx.userAccessRole.upsert({
    where: { userId_accessRoleId: { userId, accessRoleId: accessRole.id } },
    create: { userId, accessRoleId: accessRole.id, scope: "OWN" },
    update: {},
  });
  const role =
    serviceKey in SETUP_ROLE
      ? SETUP_ROLE[serviceKey as keyof typeof SETUP_ROLE]
      : undefined;
  await tx.user.update({
    where: { id: userId },
    data: {
      ...(role && user.role !== role && !user.additionalRoles.includes(role)
        ? { additionalRoles: { push: role } }
        : {}),
      permissionVersion: { increment: 1 },
      accountWelcomePending: false,
    },
  });
  await tx.userService.update({
    where: { id: enrollment.id },
    data: {
      setupStartedAt: enrollment.setupStartedAt || new Date(),
      setupCompletedAt: new Date(),
      events: {
        create: {
          actorId: userId,
          action: "SETUP_COMPLETED",
          reason: "Member completed explicit service setup",
        },
      },
    },
  });
  await tx.auditLog.create({
    data: {
      userId,
      action: "SERVICE_SETUP_COMPLETED",
      entityType: "UserService",
      entityId: enrollment.id,
      context: JSON.stringify({ serviceKey, role: role || null, scope: "OWN" }),
    },
  });
}

/** Existing profiles/authorization remain usable; newly selected incomplete services open their intake. */
export async function guardServiceEntry(
  userId: string,
  serviceKey: ServiceKey,
) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      registrationVersion: true,
      accountOnboardingCompletedAt: true,
      accountWelcomePending: true,
    },
  });
  if (user.registrationVersion === 1 && !user.accountOnboardingCompletedAt)
    redirect(productUrl("accounts", "/account/onboarding"));
  if (user.accountWelcomePending) redirect(productUrl("accounts", "/account"));
  const service = (await readAccountServices(userId)).find(
    (item) => item.id === serviceKey,
  );
  if (
    service?.state === "ENABLED" &&
    service.setupStatus !== "COMPLETE" &&
    serviceKey !== "safety"
  )
    redirect(service.setupHref);
}
