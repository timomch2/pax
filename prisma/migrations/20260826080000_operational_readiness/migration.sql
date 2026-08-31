-- CreateEnum
CREATE TYPE "OperationalJobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "OperationalJobRun" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "runKey" TEXT NOT NULL,
    "status" "OperationalJobStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "processed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "error" TEXT,

    CONSTRAINT "OperationalJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationalJobRun_runKey_key" ON "OperationalJobRun"("runKey");

-- CreateIndex
CREATE INDEX "OperationalJobRun_jobKey_startedAt_idx" ON "OperationalJobRun"("jobKey", "startedAt");

-- CreateIndex
CREATE INDEX "OperationalJobRun_status_heartbeatAt_idx" ON "OperationalJobRun"("status", "heartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSequence_practitionerId_year_key" ON "InvoiceSequence"("practitionerId", "year");

ALTER TABLE "OperationalJobRun" ADD CONSTRAINT "OperationalJobRun_counts_nonnegative" CHECK ("processed" >= 0 AND "failed" >= 0);
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_nextValue_positive" CHECK ("nextValue" > 0);
