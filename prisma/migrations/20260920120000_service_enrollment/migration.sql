-- CreateEnum
CREATE TYPE "ServiceKey" AS ENUM ('practice', 'talent', 'market', 'community');

-- CreateEnum
CREATE TYPE "ServiceEnrollmentState" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ServiceEnrollmentSource" AS ENUM ('SELF', 'LEGACY');

-- CreateTable
CREATE TABLE "UserService" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceKey" "ServiceKey" NOT NULL,
    "state" "ServiceEnrollmentState" NOT NULL DEFAULT 'ENABLED',
    "source" "ServiceEnrollmentSource" NOT NULL DEFAULT 'SELF',
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserServiceEvent" (
    "id" TEXT NOT NULL,
    "userServiceId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserServiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserService_serviceKey_state_userId_idx" ON "UserService"("serviceKey", "state", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserService_userId_serviceKey_key" ON "UserService"("userId", "serviceKey");

-- CreateIndex
CREATE INDEX "UserServiceEvent_userServiceId_createdAt_idx" ON "UserServiceEvent"("userServiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserService" ADD CONSTRAINT "UserService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserServiceEvent" ADD CONSTRAINT "UserServiceEvent_userServiceId_fkey" FOREIGN KEY ("userServiceId") REFERENCES "UserService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

