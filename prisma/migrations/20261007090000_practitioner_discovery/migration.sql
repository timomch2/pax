-- AlterTable
ALTER TABLE "practice"."PractitionerProfile" ADD COLUMN     "directoryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "practiceAddress" TEXT,
ADD COLUMN     "practiceCounty" TEXT,
ADD COLUMN     "practiceTown" TEXT,
ADD COLUMN     "specialtyGroupId" TEXT,
ADD COLUMN     "specialtyId" TEXT,
ADD COLUMN     "specialtyOther" TEXT;

-- CreateTable
CREATE TABLE "practice"."PracticeSpecialty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "parentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proposedById" TEXT,
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice"."PracticeAppointmentInquiry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "clientCode" TEXT,
    "preferredDate" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewReason" TEXT,
    "eventId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeAppointmentInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeSpecialty_normalizedName_key" ON "practice"."PracticeSpecialty"("normalizedName");

-- CreateIndex
CREATE INDEX "PracticeSpecialty_status_parentId_idx" ON "practice"."PracticeSpecialty"("status", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeAppointmentInquiry_eventId_key" ON "practice"."PracticeAppointmentInquiry"("eventId");

-- CreateIndex
CREATE INDEX "PracticeAppointmentInquiry_workspaceId_status_createdAt_idx" ON "practice"."PracticeAppointmentInquiry"("workspaceId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "practice"."PracticeSpecialty" ADD CONSTRAINT "PracticeSpecialty_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "practice"."PracticeSpecialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice"."PracticeAppointmentInquiry" ADD CONSTRAINT "PracticeAppointmentInquiry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "practice"."PracticeWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Approved reference taxonomy; no existing practitioner is assigned or published.
INSERT INTO practice."PracticeSpecialty" ("id", "name", "normalizedName", "parentId", "status", "updatedAt") VALUES
('practice-specialty-gp', 'General practice', 'general practice', NULL, 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-surgery', 'Surgery', 'surgery', NULL, 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-obgyn', 'Obstetrics and gynaecology', 'obstetrics and gynaecology', NULL, 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-paediatrics', 'Paediatrics', 'paediatrics', NULL, 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-mental-health', 'Mental health', 'mental health', NULL, 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-internal-medicine', 'Internal medicine', 'internal medicine', NULL, 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-public-health', 'Public health', 'public health', NULL, 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-surgery-1', 'General surgery', 'practice-specialty-surgery:general surgery', 'practice-specialty-surgery', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-surgery-2', 'Neurosurgery', 'practice-specialty-surgery:neurosurgery', 'practice-specialty-surgery', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-surgery-3', 'Urology', 'practice-specialty-surgery:urology', 'practice-specialty-surgery', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-obgyn-1', 'Obstetrics', 'practice-specialty-obgyn:obstetrics', 'practice-specialty-obgyn', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-obgyn-2', 'Gynaecology', 'practice-specialty-obgyn:gynaecology', 'practice-specialty-obgyn', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-paediatrics-1', 'General paediatrics', 'practice-specialty-paediatrics:general paediatrics', 'practice-specialty-paediatrics', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-mental-health-1', 'Psychiatry', 'practice-specialty-mental-health:psychiatry', 'practice-specialty-mental-health', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-mental-health-2', 'Clinical psychology', 'practice-specialty-mental-health:clinical psychology', 'practice-specialty-mental-health', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-internal-medicine-1', 'General physician', 'practice-specialty-internal-medicine:general physician', 'practice-specialty-internal-medicine', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-internal-medicine-2', 'Pulmonology', 'practice-specialty-internal-medicine:pulmonology', 'practice-specialty-internal-medicine', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-internal-medicine-3', 'Cardiology', 'practice-specialty-internal-medicine:cardiology', 'practice-specialty-internal-medicine', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-public-health-1', 'Epidemiology', 'practice-specialty-public-health:epidemiology', 'practice-specialty-public-health', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-public-health-2', 'Health economics', 'practice-specialty-public-health:health economics', 'practice-specialty-public-health', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-public-health-3', 'Health systems', 'practice-specialty-public-health:health systems', 'practice-specialty-public-health', 'APPROVED', CURRENT_TIMESTAMP),
('practice-specialty-public-health-4', 'Infectious disease', 'practice-specialty-public-health:infectious disease', 'practice-specialty-public-health', 'APPROVED', CURRENT_TIMESTAMP);
