-- CreateEnum
CREATE TYPE "UploadPurpose" AS ENUM ('PROFILE_IMAGE', 'GPS_EVIDENCE', 'INNOVATION_EVIDENCE', 'VAULT_DOCUMENT', 'VERIFICATION_DOCUMENT', 'VENDOR_DOCUMENT', 'SAFETY_ATTACHMENT');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'QUARANTINED', 'SCANNING', 'CLEAN', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "GpsEvidence" ADD COLUMN     "uploadAssetId" TEXT;

-- AlterTable
ALTER TABLE "MarketplaceBuyer" ADD COLUMN     "accreditationUploadAssetId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "VendorDocument" ADD COLUMN     "uploadAssetId" TEXT;

-- AlterTable
ALTER TABLE "VerificationDocument" ADD COLUMN     "uploadAssetId" TEXT;

-- CreateTable
CREATE TABLE "UploadAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "purpose" "UploadPurpose" NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "originalFileName" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "expectedContentType" TEXT NOT NULL,
    "expectedSize" INTEGER NOT NULL,
    "expectedChecksum" TEXT,
    "actualContentType" TEXT,
    "actualSize" INTEGER,
    "actualChecksum" TEXT,
    "objectEtag" TEXT,
    "scanProvider" TEXT,
    "scanReference" TEXT,
    "scanResult" TEXT,
    "completedAt" TIMESTAMP(3),
    "scannedAt" TIMESTAMP(3),
    "retainedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadAssetAccessLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadAssetAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadAsset_objectKey_key" ON "UploadAsset"("objectKey");

-- CreateIndex
CREATE INDEX "UploadAsset_ownerId_createdAt_idx" ON "UploadAsset"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadAsset_status_createdAt_idx" ON "UploadAsset"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UploadAsset_retainedUntil_idx" ON "UploadAsset"("retainedUntil");

-- CreateIndex
CREATE INDEX "UploadAssetAccessLog_assetId_createdAt_idx" ON "UploadAssetAccessLog"("assetId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadAssetAccessLog_actorId_createdAt_idx" ON "UploadAssetAccessLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GpsEvidence_uploadAssetId_key" ON "GpsEvidence"("uploadAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceBuyer_accreditationUploadAssetId_key" ON "MarketplaceBuyer"("accreditationUploadAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDocument_uploadAssetId_key" ON "VendorDocument"("uploadAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationDocument_uploadAssetId_key" ON "VerificationDocument"("uploadAssetId");

-- AddForeignKey
ALTER TABLE "GpsEvidence" ADD CONSTRAINT "GpsEvidence_uploadAssetId_fkey" FOREIGN KEY ("uploadAssetId") REFERENCES "UploadAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_uploadAssetId_fkey" FOREIGN KEY ("uploadAssetId") REFERENCES "UploadAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBuyer" ADD CONSTRAINT "MarketplaceBuyer_accreditationUploadAssetId_fkey" FOREIGN KEY ("accreditationUploadAssetId") REFERENCES "UploadAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_uploadAssetId_fkey" FOREIGN KEY ("uploadAssetId") REFERENCES "UploadAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadAsset" ADD CONSTRAINT "UploadAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadAssetAccessLog" ADD CONSTRAINT "UploadAssetAccessLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UploadAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
