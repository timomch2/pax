ALTER TABLE "Refund"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "Refund" SET "idempotencyKey" = 'legacy:' || "id" WHERE "idempotencyKey" IS NULL;
ALTER TABLE "Refund" ALTER COLUMN "idempotencyKey" SET NOT NULL;
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

ALTER TABLE "DataSubjectRequest"
  ADD COLUMN "executionConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "executedAt" TIMESTAMP(3),
  ADD COLUMN "executionSummary" JSONB;
