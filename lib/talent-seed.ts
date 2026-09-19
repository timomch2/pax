import { prisma } from "@/lib/db";
import { PERMISSIONS, ROLE_PERMISSION_KEYS } from "@/lib/permissions";
import {
  TALENT_NOTIFICATION_TEMPLATES,
  TALENT_INVITATION_TEMPLATE,
} from "@/lib/talent-notifications";

/** Add Talent foundations without changing existing account credentials or permission overrides. */
export async function seedTalentFoundation() {
  const role = await prisma.accessRole.upsert({
    where: { key: "MEMBER" },
    update: {},
    create: {
      key: "MEMBER",
      name: "PAX Member",
      description: "Talent member without clinical access",
      isSystem: true,
    },
  });
  for (const key of ROLE_PERMISSION_KEYS.MEMBER) {
    const definition = PERMISSIONS.find((p) => p[0] === key)!;
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, resource: definition[1], action: definition[2] },
    });
    await prisma.rolePermission.upsert({
      where: {
        accessRoleId_permissionId: {
          accessRoleId: role.id,
          permissionId: permission.id,
        },
      },
      create: {
        accessRoleId: role.id,
        permissionId: permission.id,
        scope: "OWN",
      },
      update: {},
    });
  }
  for (const template of [
    ...TALENT_NOTIFICATION_TEMPLATES,
    TALENT_INVITATION_TEMPLATE,
  ])
    await prisma.notificationTemplate.upsert({
      where: {
        slug_channel_locale_version: {
          slug: template.slug,
          channel: template.channel,
          locale: "en",
          version: 1,
        },
      },
      create: { ...template, locale: "en", version: 1 },
      update: {},
    });
  await prisma.dataRetentionPolicy.upsert({
    where: { dataCategory: "TALENT_RECRUITMENT" },
    create: {
      dataCategory: "TALENT_RECRUITMENT",
      description:
        "Remove personal application and conversation content 12 months after recruitment concludes, except recorded holds.",
      legalBasis:
        "Approved product retention default; deployment administrator records operational policy approval.",
      retentionDays: 365,
      action: "DEIDENTIFY",
      active: false,
    },
    update: {},
  });
}
