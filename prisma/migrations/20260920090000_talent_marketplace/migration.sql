-- CreateEnum
CREATE TYPE "TalentVisibility" AS ENUM ('PRIVATE', 'RECRUITERS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "TalentHiringKind" AS ENUM ('PERSONAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "TalentVerification" AS ENUM ('DRAFT', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TalentTeamRole" AS ENUM ('ADMIN', 'RECRUITER', 'REVIEWER');

-- CreateEnum
CREATE TYPE "TalentConversationStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MEMBER';

-- AlterEnum
ALTER TYPE "UploadPurpose" ADD VALUE 'TALENT_DOCUMENT';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "applicationConfig" JSONB NOT NULL DEFAULT '{"cv":"REQUIRED","coverLetter":"OPTIONAL","documents":"OPTIONAL","questions":[]}',
ADD COLUMN     "desirableSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hiringProfileId" TEXT,
ADD COLUMN     "minimumYears" INTEGER,
ADD COLUMN     "recruitmentClosedAt" TIMESTAMP(3),
ADD COLUMN     "remoteCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "salaryPeriod" TEXT,
ADD COLUMN     "specialty" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "attachmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "holdReason" TEXT,
ADD COLUMN     "redactedAt" TIMESTAMP(3),
ADD COLUMN     "retainedUntil" TIMESTAMP(3),
ADD COLUMN     "retentionHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "snapshot" JSONB;

-- AlterTable
ALTER TABLE "UploadAsset" ADD COLUMN     "contentValidatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TalentProfile" (
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'KE',
    "specialty" TEXT NOT NULL DEFAULT '',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experiences" JSONB NOT NULL DEFAULT '[]',
    "education" JSONB NOT NULL DEFAULT '[]',
    "credentials" JSONB NOT NULL DEFAULT '[]',
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTypes" "EmploymentType"[] DEFAULT ARRAY[]::"EmploymentType"[],
    "preferredModes" "WorkMode"[] DEFAULT ARRAY[]::"WorkMode"[],
    "preferredCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "availability" TEXT NOT NULL DEFAULT '',
    "visibility" "TalentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "sharedGpsIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avatarAssetId" TEXT,
    "savedResumeAssetId" TEXT,
    "adultConfirmedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "TalentHiringProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "TalentHiringKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "website" TEXT,
    "location" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'KE',
    "logoAssetId" TEXT,
    "verification" "TalentVerification" NOT NULL DEFAULT 'DRAFT',
    "verificationStatement" TEXT NOT NULL DEFAULT '',
    "verificationAssetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verificationNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentHiringProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentMember" (
    "id" TEXT NOT NULL,
    "hiringProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TalentTeamRole" NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentJobAssignment" (
    "jobId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "TalentJobAssignment_pkey" PRIMARY KEY ("jobId","memberId")
);

-- CreateTable
CREATE TABLE "TalentTeamInvitation" (
    "id" TEXT NOT NULL,
    "hiringProfileId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TalentTeamRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentTeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentApplicationDraft" (
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentApplicationDraft_pkey" PRIMARY KEY ("jobId","userId")
);

-- CreateTable
CREATE TABLE "TalentApplicationNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentConversation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "TalentConversationStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" TEXT,
    "retainedUntil" TIMESTAMP(3),
    "redactedAt" TIMESTAMP(3),
    "retentionHold" BOOLEAN NOT NULL DEFAULT false,
    "holdReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentBlock" (
    "userId" TEXT NOT NULL,
    "hiringProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentBlock_pkey" PRIMARY KEY ("userId","hiringProfileId")
);

-- CreateTable
CREATE TABLE "TalentSavedJob" (
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentSavedJob_pkey" PRIMARY KEY ("userId","jobId")
);

-- CreateTable
CREATE TABLE "TalentSavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastAlertAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentSavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TalentProfile_visibility_specialty_idx" ON "TalentProfile"("visibility", "specialty");

-- CreateIndex
CREATE UNIQUE INDEX "TalentHiringProfile_slug_key" ON "TalentHiringProfile"("slug");

-- CreateIndex
CREATE INDEX "TalentHiringProfile_ownerId_idx" ON "TalentHiringProfile"("ownerId");

-- CreateIndex
CREATE INDEX "TalentHiringProfile_verification_idx" ON "TalentHiringProfile"("verification");

-- CreateIndex
CREATE INDEX "TalentMember_userId_revokedAt_idx" ON "TalentMember"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TalentMember_hiringProfileId_userId_key" ON "TalentMember"("hiringProfileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentTeamInvitation_tokenHash_key" ON "TalentTeamInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "TalentTeamInvitation_hiringProfileId_email_idx" ON "TalentTeamInvitation"("hiringProfileId", "email");

-- CreateIndex
CREATE INDEX "TalentApplicationNote_applicationId_createdAt_idx" ON "TalentApplicationNote"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "TalentConversation_candidateId_updatedAt_idx" ON "TalentConversation"("candidateId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TalentConversation_jobId_candidateId_key" ON "TalentConversation"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "TalentMessage_conversationId_createdAt_idx" ON "TalentMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TalentMessage_conversationId_senderId_clientId_key" ON "TalentMessage"("conversationId", "senderId", "clientId");

-- CreateIndex
CREATE INDEX "TalentSavedSearch_userId_idx" ON "TalentSavedSearch"("userId");

-- CreateIndex
CREATE INDEX "TalentReport_resolvedAt_createdAt_idx" ON "TalentReport"("resolvedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_hiringProfileId_fkey" FOREIGN KEY ("hiringProfileId") REFERENCES "TalentHiringProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentProfile" ADD CONSTRAINT "TalentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentHiringProfile" ADD CONSTRAINT "TalentHiringProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentMember" ADD CONSTRAINT "TalentMember_hiringProfileId_fkey" FOREIGN KEY ("hiringProfileId") REFERENCES "TalentHiringProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentMember" ADD CONSTRAINT "TalentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentJobAssignment" ADD CONSTRAINT "TalentJobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentJobAssignment" ADD CONSTRAINT "TalentJobAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TalentMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentTeamInvitation" ADD CONSTRAINT "TalentTeamInvitation_hiringProfileId_fkey" FOREIGN KEY ("hiringProfileId") REFERENCES "TalentHiringProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentApplicationDraft" ADD CONSTRAINT "TalentApplicationDraft_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentApplicationDraft" ADD CONSTRAINT "TalentApplicationDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentApplicationNote" ADD CONSTRAINT "TalentApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentConversation" ADD CONSTRAINT "TalentConversation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentConversation" ADD CONSTRAINT "TalentConversation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentMessage" ADD CONSTRAINT "TalentMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TalentConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentBlock" ADD CONSTRAINT "TalentBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentBlock" ADD CONSTRAINT "TalentBlock_hiringProfileId_fkey" FOREIGN KEY ("hiringProfileId") REFERENCES "TalentHiringProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentSavedJob" ADD CONSTRAINT "TalentSavedJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentSavedJob" ADD CONSTRAINT "TalentSavedJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentSavedSearch" ADD CONSTRAINT "TalentSavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
