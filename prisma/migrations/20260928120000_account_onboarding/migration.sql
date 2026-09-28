-- Nullable account markers grandfather existing members without rewriting profiles or preferences.
ALTER TABLE "User" ADD COLUMN "registrationVersion" INTEGER,
ADD COLUMN "accountOnboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN "accountWelcomePending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserService" ADD COLUMN "setupStartedAt" TIMESTAMP(3),
ADD COLUMN "setupCompletedAt" TIMESTAMP(3), ADD COLUMN "setupChoice" TEXT;
ALTER TABLE "TalentProfile" ADD COLUMN "personalVision" TEXT NOT NULL DEFAULT '',
ADD COLUMN "motto" TEXT NOT NULL DEFAULT '', ADD COLUMN "participantCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "communityHealthUnit" TEXT NOT NULL DEFAULT '', ADD COLUMN "chwCounty" TEXT NOT NULL DEFAULT '',
ADD COLUMN "institution" TEXT NOT NULL DEFAULT '', ADD COLUMN "courseOfStudy" TEXT NOT NULL DEFAULT '',
ADD COLUMN "studyYear" TEXT NOT NULL DEFAULT '';

-- Neutral members may report concerns and request verification, never read surveillance data.
INSERT INTO "RolePermission" ("id", "accessRoleId", "permissionId", "scope")
SELECT 'onboarding-' || md5(r."id" || p."id"), r."id", p."id", 'OWN'::"AccessScope"
FROM "AccessRole" r CROSS JOIN "Permission" p
WHERE r."key" = 'MEMBER' AND p."key" IN ('safety.report.create', 'verification.request')
ON CONFLICT ("accessRoleId", "permissionId") DO NOTHING;
