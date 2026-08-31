-- CreateEnum
CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE', 'OBJECTION', 'RESTRICTION', 'PORTABILITY', 'CONSENT_WITHDRAWAL');

-- CreateEnum
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('RECEIVED', 'ACKNOWLEDGED', 'IN_REVIEW', 'WAITING_USER', 'PARTIALLY_COMPLETED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RetentionAction" AS ENUM ('DELETE', 'DEIDENTIFY', 'ARCHIVE', 'REVIEW');

-- CreateEnum
CREATE TYPE "SecurityIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SecurityIncidentStatus" AS ENUM ('OPEN', 'CONTAINED', 'INVESTIGATING', 'REMEDIATED', 'CLOSED');

-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "type" "DataSubjectRequestType" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "scope" TEXT,
    "reason" TEXT,
    "assignedToId" TEXT,
    "acknowledgementDueAt" TIMESTAMP(3) NOT NULL,
    "resolutionDueAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "retentionExceptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubjectRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" "DataSubjectRequestStatus",
    "toStatus" "DataSubjectRequestStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSubjectRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "dataCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "action" "RetentionAction" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "SecurityIncidentSeverity" NOT NULL,
    "status" "SecurityIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "reporterId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "personalDataInvolved" BOOLEAN NOT NULL DEFAULT false,
    "affectedSubjects" INTEGER,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "containedAt" TIMESTAMP(3),
    "authorityNotifiedAt" TIMESTAMP(3),
    "subjectsNotifiedAt" TIMESTAMP(3),
    "remediation" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSubjectRequest_requesterId_createdAt_idx" ON "DataSubjectRequest"("requesterId", "createdAt");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_status_resolutionDueAt_idx" ON "DataSubjectRequest"("status", "resolutionDueAt");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_assignedToId_status_idx" ON "DataSubjectRequest"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "DataSubjectRequestEvent_requestId_createdAt_idx" ON "DataSubjectRequestEvent"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionPolicy_dataCategory_key" ON "DataRetentionPolicy"("dataCategory");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_active_idx" ON "DataRetentionPolicy"("active");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityIncident_reference_key" ON "SecurityIncident"("reference");

-- CreateIndex
CREATE INDEX "SecurityIncident_status_severity_idx" ON "SecurityIncident"("status", "severity");

-- CreateIndex
CREATE INDEX "SecurityIncident_assignedToId_status_idx" ON "SecurityIncident"("assignedToId", "status");

-- AddForeignKey
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequestEvent" ADD CONSTRAINT "DataSubjectRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DataSubjectRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequestEvent" ADD CONSTRAINT "DataSubjectRequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataRetentionPolicy" ADD CONSTRAINT "DataRetentionPolicy_retentionDays_positive" CHECK ("retentionDays" > 0);
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_affectedSubjects_nonnegative" CHECK ("affectedSubjects" IS NULL OR "affectedSubjects" >= 0);
