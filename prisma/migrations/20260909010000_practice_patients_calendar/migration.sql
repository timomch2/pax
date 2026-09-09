-- CreateEnum
CREATE TYPE "PracticeEventKind" AS ENUM ('APPOINTMENT', 'CONSULTING', 'MEETING');

-- CreateEnum
CREATE TYPE "PracticeEventStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "HubPatient" ADD COLUMN     "legacyUserId" TEXT;

-- CreateTable
CREATE TABLE "PracticeEventSeries" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeEventSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "patientId" TEXT,
    "facilityId" TEXT,
    "seriesId" TEXT,
    "legacyAppointmentId" TEXT,
    "kind" "PracticeEventKind" NOT NULL,
    "status" "PracticeEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "title" TEXT NOT NULL,
    "serviceCode" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "notes" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "rateSnapshot" JSONB NOT NULL DEFAULT '{}',
    "overrideReason" TEXT,
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeService" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "eventId" TEXT,
    "facilityId" TEXT,
    "patientId" TEXT,
    "serviceCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "coveredByRetainer" BOOLEAN NOT NULL DEFAULT false,
    "rateSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticePatientNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticePatientNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeEvent_legacyAppointmentId_key" ON "PracticeEvent"("legacyAppointmentId");

-- CreateIndex
CREATE INDEX "PracticeEvent_workspaceId_startsAt_endsAt_idx" ON "PracticeEvent"("workspaceId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PracticeEvent_seriesId_startsAt_idx" ON "PracticeEvent"("seriesId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeService_sourceKey_key" ON "PracticeService"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeService_eventId_key" ON "PracticeService"("eventId");

-- CreateIndex
CREATE INDEX "PracticeService_workspaceId_serviceDate_idx" ON "PracticeService"("workspaceId", "serviceDate");

-- CreateIndex
CREATE INDEX "PracticePatientNote_patientId_createdAt_idx" ON "PracticePatientNote"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HubPatient_practitionerId_legacyUserId_key" ON "HubPatient"("practitionerId", "legacyUserId");

-- AddForeignKey
ALTER TABLE "HubPatient" ADD CONSTRAINT "HubPatient_legacyUserId_fkey" FOREIGN KEY ("legacyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEventSeries" ADD CONSTRAINT "PracticeEventSeries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HubPatient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "PracticeEventSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_legacyAppointmentId_fkey" FOREIGN KEY ("legacyAppointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeService" ADD CONSTRAINT "PracticeService_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeService" ADD CONSTRAINT "PracticeService_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PracticeEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeService" ADD CONSTRAINT "PracticeService_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeService" ADD CONSTRAINT "PracticeService_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HubPatient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticePatientNote" ADD CONSTRAINT "PracticePatientNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "HubPatient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Calendar and clinical charges preserve valid time and money ranges.
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_time_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_fee_check" CHECK ("feeMinor" >= 0);
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_kind_patient_check" CHECK (
  (kind = 'APPOINTMENT' AND "patientId" IS NOT NULL) OR (kind <> 'APPOINTMENT' AND "patientId" IS NULL)
);
ALTER TABLE "PracticeEvent" ADD CONSTRAINT "PracticeEvent_clinical_billing_check" CHECK (kind <> 'MEETING' OR NOT billable);
ALTER TABLE "PracticeService" ADD CONSTRAINT "PracticeService_amount_check" CHECK ("amountMinor" >= 0);
