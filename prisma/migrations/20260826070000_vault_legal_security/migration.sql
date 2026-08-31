-- CreateTable
CREATE TABLE "NdaTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NdaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NdaAcceptance" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "acceptorId" TEXT NOT NULL,
    "typedName" TEXT NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "organization" TEXT,
    "innovationId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "NdaAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultDocument" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assetId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NdaTemplate_slug_active_effectiveAt_idx" ON "NdaTemplate"("slug", "active", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "NdaTemplate_slug_version_key" ON "NdaTemplate"("slug", "version");

-- CreateIndex
CREATE UNIQUE INDEX "NdaAcceptance_accessRequestId_key" ON "NdaAcceptance"("accessRequestId");

-- CreateIndex
CREATE INDEX "NdaAcceptance_acceptorId_acceptedAt_idx" ON "NdaAcceptance"("acceptorId", "acceptedAt");

-- CreateIndex
CREATE INDEX "NdaAcceptance_innovationId_idx" ON "NdaAcceptance"("innovationId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultDocument_assetId_key" ON "VaultDocument"("assetId");

-- CreateIndex
CREATE INDEX "VaultDocument_innovationId_active_idx" ON "VaultDocument"("innovationId", "active");

-- CreateIndex
CREATE INDEX "VaultDocument_ownerId_idx" ON "VaultDocument"("ownerId");

-- AddForeignKey
ALTER TABLE "NdaAcceptance" ADD CONSTRAINT "NdaAcceptance_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "VaultAccessRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NdaAcceptance" ADD CONSTRAINT "NdaAcceptance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NdaTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NdaAcceptance" ADD CONSTRAINT "NdaAcceptance_acceptorId_fkey" FOREIGN KEY ("acceptorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultDocument" ADD CONSTRAINT "VaultDocument_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultDocument" ADD CONSTRAINT "VaultDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UploadAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
