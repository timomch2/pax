-- CreateEnum
CREATE TYPE "PracticeTeamRole" AS ENUM ('RECEPTION', 'FINANCE');

-- CreateEnum
CREATE TYPE "FacilityReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'STAFF';

-- CreateTable
CREATE TABLE "PracticeWorkspace" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "bookingSlug" TEXT NOT NULL,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "appointmentReminderHours" INTEGER NOT NULL DEFAULT 24,
    "overdueReminderDays" INTEGER[] DEFAULT ARRAY[1, 7]::INTEGER[],
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roles" "PracticeTeamRole"[],
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roles" "PracticeTeamRole"[],
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthFacility" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "county" TEXT,
    "subCounty" TEXT,
    "town" TEXT,
    "facilityType" TEXT,
    "ownership" TEXT,
    "kephLevel" TEXT,
    "regulatoryBody" TEXT,
    "source" TEXT,
    "sourceKey" TEXT,
    "fidCode" TEXT,
    "frCode" TEXT,
    "registrationNumber" TEXT,
    "operationalStatus" TEXT,
    "sourceSnapshot" JSONB,
    "sourceSeenAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultingFacility" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "rateType" TEXT NOT NULL DEFAULT 'SERVICE',
    "rateMinor" INTEGER NOT NULL DEFAULT 0,
    "coveredServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultingFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityCorrection" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT,
    "proposedById" TEXT,
    "importRunId" TEXT,
    "dedupeKey" TEXT,
    "baseVersion" INTEGER,
    "proposed" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "FacilityReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityImportRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'KE_NHFR',
    "requestedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "nextPage" INTEGER NOT NULL DEFAULT 0,
    "pageSize" INTEGER NOT NULL DEFAULT 30,
    "totalMatches" INTEGER,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,
    "queued" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeWorkspace_ownerId_key" ON "PracticeWorkspace"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeWorkspace_bookingSlug_key" ON "PracticeWorkspace"("bookingSlug");

-- CreateIndex
CREATE INDEX "PracticeMember_userId_revokedAt_idx" ON "PracticeMember"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeMember_workspaceId_userId_key" ON "PracticeMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeInvitation_tokenHash_key" ON "PracticeInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "PracticeInvitation_workspaceId_email_idx" ON "PracticeInvitation"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "PracticeAuditEvent_workspaceId_createdAt_idx" ON "PracticeAuditEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthFacility_sourceKey_key" ON "HealthFacility"("sourceKey");

-- CreateIndex
CREATE INDEX "HealthFacility_countryCode_normalizedName_idx" ON "HealthFacility"("countryCode", "normalizedName");

-- CreateIndex
CREATE INDEX "HealthFacility_countryCode_county_idx" ON "HealthFacility"("countryCode", "county");

-- CreateIndex
CREATE INDEX "HealthFacility_fidCode_idx" ON "HealthFacility"("fidCode");

-- CreateIndex
CREATE INDEX "HealthFacility_registrationNumber_idx" ON "HealthFacility"("registrationNumber");

-- CreateIndex
CREATE INDEX "ConsultingFacility_workspaceId_endsAt_idx" ON "ConsultingFacility"("workspaceId", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultingFacility_workspaceId_facilityId_startsAt_key" ON "ConsultingFacility"("workspaceId", "facilityId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityCorrection_dedupeKey_key" ON "FacilityCorrection"("dedupeKey");

-- CreateIndex
CREATE INDEX "FacilityCorrection_status_createdAt_idx" ON "FacilityCorrection"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FacilityImportRun_status_updatedAt_idx" ON "FacilityImportRun"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "PracticeWorkspace" ADD CONSTRAINT "PracticeWorkspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeMember" ADD CONSTRAINT "PracticeMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeMember" ADD CONSTRAINT "PracticeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvitation" ADD CONSTRAINT "PracticeInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAuditEvent" ADD CONSTRAINT "PracticeAuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultingFacility" ADD CONSTRAINT "ConsultingFacility_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultingFacility" ADD CONSTRAINT "ConsultingFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityCorrection" ADD CONSTRAINT "FacilityCorrection_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Workspace-local staff roles cannot be empty or repeated.
ALTER TABLE "PracticeMember" ADD CONSTRAINT "PracticeMember_roles_check" CHECK (
  cardinality(roles) = 1 OR (cardinality(roles) = 2 AND roles @> ARRAY['RECEPTION','FINANCE']::"PracticeTeamRole"[])
);
ALTER TABLE "PracticeInvitation" ADD CONSTRAINT "PracticeInvitation_roles_check" CHECK (
  cardinality(roles) = 1 OR (cardinality(roles) = 2 AND roles @> ARRAY['RECEPTION','FINANCE']::"PracticeTeamRole"[])
);
ALTER TABLE "ConsultingFacility" ADD CONSTRAINT "ConsultingFacility_dates_rate_check" CHECK (
  "rateMinor" >= 0 AND ("endsAt" IS NULL OR "endsAt" >= "startsAt") AND "rateType" IN ('SERVICE','HOUR','SESSION','MONTHLY')
);
ALTER TABLE "FacilityImportRun" ADD CONSTRAINT "FacilityImportRun_pagination_check" CHECK (
  "nextPage" >= 0 AND "pageSize" BETWEEN 1 AND 30
);
