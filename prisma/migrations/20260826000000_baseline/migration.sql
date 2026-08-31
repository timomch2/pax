-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PRACTITIONER', 'PATIENT', 'ADMIN', 'INNOVATOR', 'INVESTOR', 'EMPLOYER', 'POLICYMAKER');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('TIER1_BASIC', 'TIER2_PROFESSIONAL', 'TIER3_EXPERT');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('NONE', 'EMAIL_VERIFIED', 'IDENTITY_VERIFIED', 'EXPERT_VERIFIED');

-- CreateEnum
CREATE TYPE "VerificationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InnovationStage" AS ENUM ('IDEA', 'PROTOTYPE', 'PILOT', 'SCALING');

-- CreateEnum
CREATE TYPE "InnovationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'COMMUNITY_VALIDATED', 'INVESTOR_READY', 'FUNDED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'RELEASED');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('INTERESTED', 'DUE_DILIGENCE', 'COMMITTED', 'DISBURSING', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "CashFlowType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "DiligenceStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'BILLING', 'INVESTMENT', 'MILESTONE', 'APPOINTMENT');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'REVIEW', 'WARD_ROUND', 'THEATRE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('PATIENT', 'INSURER', 'EMPLOYER', 'SHA_NHIF', 'NGO_DONOR', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MPESA', 'CARD', 'BANK_TRANSFER', 'INSURANCE', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "InsurerCategory" AS ENUM ('PUBLIC', 'PRIVATE', 'CORPORATE', 'NGO_DONOR', 'OTHER');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "GpsEntryType" AS ENUM ('FORMAL_ROLE', 'COMMUNITY_INITIATIVE', 'RESEARCH_POLICY', 'VOLUNTEER', 'TRADITIONAL_KNOWLEDGE');

-- CreateEnum
CREATE TYPE "GpsEndorserType" AS ENUM ('SUPERVISOR', 'COMMUNITY_ORG', 'BENEFICIARY', 'EXPERT', 'PEER', 'ACADEMIC');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SideEffectSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "DebateType" AS ENUM ('POLICY_PRACTICE', 'RESEARCH_FEASIBILITY', 'INNOVATION_PILOT');

-- CreateEnum
CREATE TYPE "DebateStatus" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'OPEN', 'CLOSING_SOON', 'CLOSED', 'IN_SYNTHESIS', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ContributionKind" AS ENUM ('SHORT_REVIEW', 'EXPERT_OPINION');

-- CreateEnum
CREATE TYPE "StanceType" AS ENUM ('AGREE', 'DISAGREE', 'PARTLY_AGREE', 'INSUFFICIENT_EVIDENCE', 'RELEVANT_MY_SETTING', 'NOT_FEASIBLE_MY_SETTING');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('OK', 'FLAGGED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MarketplacePillar" AS ENUM ('DIGITAL_TOOLS_IP', 'HEALTH_SECURITY_ANALYTICS', 'LAB_RADIOLOGICAL_HARDWARE', 'PHARMA_DIRECTORY');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FROZEN');

-- CreateEnum
CREATE TYPE "MarketplaceListingType" AS ENUM ('PRODUCT', 'SERVICE', 'SOFTWARE', 'FACILITY_PROFILE', 'DIRECTORY_PROFILE');

-- CreateEnum
CREATE TYPE "BuyerEntityType" AS ENUM ('PUBLIC_HEALTH_AGENCY', 'HOSPITAL_CLINIC', 'ACCREDITED_LAB', 'NGO_DONOR', 'RESEARCH_CENTER');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('ACCOUNT_TERMS', 'PRIVACY_POLICY', 'HEALTH_DATA_PROCESSING', 'MARKETING', 'CROSS_BORDER_TRANSFER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "additionalRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tier" "MembershipTier" NOT NULL DEFAULT 'TIER1_BASIC',
    "phone" TEXT,
    "paxId" TEXT,
    "organization" TEXT,
    "bio" TEXT,
    "linkedinUrl" TEXT,
    "headline" TEXT,
    "location" TEXT,
    "physicalAddress" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "healthAreas" TEXT,
    "credibilityScore" INTEGER NOT NULL DEFAULT 0,
    "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'NONE',
    "hubMember" BOOLEAN NOT NULL DEFAULT false,
    "hubJoinedAt" TIMESTAMP(3),
    "consentedAt" TIMESTAMP(3),
    "privacyPolicyVersion" TEXT,
    "termsVersion" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PractitionerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medicalRegNumber" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "consultationRate" INTEGER NOT NULL DEFAULT 2500,
    "hospital" TEXT,
    "bio" TEXT,
    "clinicId" TEXT,
    "affiliations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Innovation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "sector" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "problem" TEXT,
    "solution" TEXT,
    "stage" "InnovationStage" NOT NULL DEFAULT 'IDEA',
    "status" "InnovationStatus" NOT NULL DEFAULT 'DRAFT',
    "fundingGoal" INTEGER NOT NULL DEFAULT 0,
    "fundingRaised" INTEGER NOT NULL DEFAULT 0,
    "validationScore" INTEGER NOT NULL DEFAULT 0,
    "credibilityScore" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "imageUrl" TEXT,
    "team" TEXT,
    "evidence" TEXT,
    "fundingUse" TEXT,
    "ipHash" TEXT,
    "ipTimestampedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "ipProtectionLevel" TEXT,
    "patentRegNumber" TEXT,
    "patentJurisdiction" TEXT,
    "openSourceLicense" TEXT,
    "priorDisclosure" BOOLEAN NOT NULL DEFAULT false,
    "priorDisclosureDate" TIMESTAMP(3),
    "thirdPartyDeps" BOOLEAN NOT NULL DEFAULT false,
    "thirdPartyDepsNote" TEXT,
    "revenueModel" TEXT,
    "impactStatement" TEXT,
    "selfAssessmentData" TEXT,
    "selfAssessmentCompleted" BOOLEAN NOT NULL DEFAULT false,
    "declarationSignedAt" TIMESTAMP(3),
    "technicalBlueprint" TEXT,
    "financialModelDetail" TEXT,
    "patentDocumentation" TEXT,
    "clinicalData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Innovation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" INTEGER NOT NULL DEFAULT 0,
    "releasedAmount" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'INTERESTED',
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceItem" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "status" "DiligenceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowEntry" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "type" "CashFlowType" NOT NULL,
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashFlowEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endorsement" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "endorserId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Endorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "entryType" "GpsEntryType" NOT NULL DEFAULT 'FORMAL_ROLE',
    "healthArea" TEXT,
    "geography" TEXT,
    "periodStart" TEXT,
    "periodEnd" TEXT,
    "gap" TEXT NOT NULL,
    "rootCause" TEXT,
    "solution" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "lessonsLearned" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GpsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeBrief" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "healthArea" TEXT,
    "geography" TEXT,
    "problem" TEXT NOT NULL,
    "lookingFor" TEXT NOT NULL,
    "deadline" TEXT,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeResponse" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "gpsEntryId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsEvidence" (
    "id" TEXT NOT NULL,
    "gpsEntryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "cloudStoragePath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpsEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsEndorsement" (
    "id" TEXT NOT NULL,
    "gpsEntryId" TEXT NOT NULL,
    "endorserId" TEXT NOT NULL,
    "endorserType" "GpsEndorserType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpsEndorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTATION',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "location" TEXT,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdverseDrugReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "drugName" TEXT NOT NULL,
    "doseTaken" TEXT NOT NULL,
    "sideEffects" TEXT NOT NULL,
    "severity" "SideEffectSeverity" NOT NULL DEFAULT 'MODERATE',
    "patientAge" INTEGER NOT NULL,
    "patientGender" TEXT NOT NULL,
    "patientWeight" DOUBLE PRECISION,
    "isPregnant" BOOLEAN NOT NULL DEFAULT false,
    "otherMedication" TEXT,
    "onsetDaysAgo" INTEGER,
    "durationDays" INTEGER,
    "treatmentGiven" BOOLEAN,
    "treatmentDetails" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Kenya',
    "description" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archiveRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdverseDrugReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFeedback" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT,
    "productName" TEXT NOT NULL,
    "productSize" TEXT,
    "isOnPlatform" BOOLEAN NOT NULL DEFAULT false,
    "innovationId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isExpertReview" BOOLEAN NOT NULL DEFAULT false,
    "hasEvidence" BOOLEAN NOT NULL DEFAULT false,
    "evidenceUrl" TEXT,
    "feedbackTier" TEXT NOT NULL DEFAULT 'STAR',
    "expertWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reporterEmail" TEXT,
    "province" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Kenya',
    "archivedAt" TIMESTAMP(3),
    "archiveRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubPatient" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "patientCode" TEXT,
    "nationalId" TEXT,
    "patientRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insurer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "category" "InsurerCategory" NOT NULL DEFAULT 'PRIVATE',
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "hubPatientId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "serviceDesc" TEXT NOT NULL,
    "serviceType" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayer" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "payerType" "PayerType" NOT NULL DEFAULT 'PATIENT',
    "payerName" TEXT NOT NULL,
    "insurerId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "method" "PaymentMethod",
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL,
    "invoicePayerId" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'IN_APP',
    "message" TEXT NOT NULL,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debate" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "type" "DebateType" NOT NULL,
    "status" "DebateStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "motion" TEXT NOT NULL,
    "healthDomain" TEXT,
    "geographyFocus" TEXT,
    "anchorType" TEXT,
    "anchorReference" TEXT,
    "standardRecommendation" TEXT,
    "background" TEXT,
    "problemStatement" TEXT NOT NULL,
    "promptGroundTruth" TEXT,
    "promptAdaptation" TEXT,
    "promptFeasibility" TEXT,
    "devilsAdvocateId" TEXT,
    "closesAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "relatedInnovationId" TEXT,
    "relatedListingId" TEXT,
    "consensusAbstract" TEXT,
    "consensusBrief" TEXT,
    "consensusPublishedAt" TIMESTAMP(3),
    "feasibilityConsensus" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 99,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "providerReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorMandate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "geographies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ticketMinUsd" INTEGER NOT NULL DEFAULT 0,
    "ticketMaxUsd" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "notifyOnMatch" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ethicalManifestoAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorMandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateContribution" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "ContributionKind" NOT NULL DEFAULT 'SHORT_REVIEW',
    "body" TEXT NOT NULL,
    "dimension" TEXT,
    "feasibilityScore" INTEGER,
    "implementationSetting" TEXT,
    "evidenceUrl" TEXT,
    "isDevilsAdvocate" BOOLEAN NOT NULL DEFAULT false,
    "isExpert" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'OK',
    "moderationReason" TEXT,
    "moderationReviewedById" TEXT,
    "moderationReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateStance" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" "StanceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateStance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionUpvote" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContributionUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAccessRequest" (
    "id" TEXT NOT NULL,
    "innovationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "ndaSignedAt" TIMESTAMP(3),
    "ndaIpAddress" TEXT,
    "ndaSnapshot" TEXT,
    "innovatorApprovedAt" TIMESTAMP(3),
    "innovatorDeniedAt" TIMESTAMP(3),
    "denialReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceVendor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "corporateName" TEXT NOT NULL,
    "tradingName" TEXT,
    "country" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "taxId" TEXT,
    "headOfficeAddress" TEXT NOT NULL,
    "city" TEXT,
    "postalCode" TEXT,
    "contactPerson" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "primaryPillar" "MarketplacePillar" NOT NULL,
    "acceptedNoDirectDrugSales" BOOLEAN NOT NULL DEFAULT false,
    "acceptedPureIntermediary" BOOLEAN NOT NULL DEFAULT false,
    "acceptedB2BTestKitRestriction" BOOLEAN NOT NULL DEFAULT false,
    "acceptedFullIndemnification" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAIModeration" BOOLEAN NOT NULL DEFAULT false,
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "frozenAt" TIMESTAMP(3),
    "licenseExpiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "cloudStoragePath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "expiryDate" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "pillar" "MarketplacePillar" NOT NULL,
    "listingType" "MarketplaceListingType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT,
    "catalogNumber" TEXT,
    "manufacturer" TEXT,
    "regionFocus" TEXT,
    "externalUrl" TEXT,
    "imageUrls" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isPaxCertified" BOOLEAN NOT NULL DEFAULT false,
    "paxCertifiedAt" TIMESTAMP(3),
    "paxCertifiedReason" TEXT,
    "priceDisplay" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'OK',
    "moderationReason" TEXT,
    "moderationCategories" TEXT,
    "avgRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceTransaction" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KSh',
    "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "netToVendor" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECORDED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceReview" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceBuyer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "entityType" "BuyerEntityType" NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "country" TEXT,
    "physicalAddress" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "procurementOfficer" TEXT NOT NULL,
    "officerTitle" TEXT,
    "officerEmail" TEXT NOT NULL,
    "accreditationPath" TEXT,
    "acceptedDirectProcurement" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBuyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedLevel" "VerificationLevel" NOT NULL,
    "peerVouchers" TEXT,
    "status" "VerificationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "cloudStoragePath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "policyVersion" TEXT,
    "termsVersion" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_tier_idx" ON "User"("tier");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_paxId_idx" ON "User"("paxId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerProfile_userId_key" ON "PractitionerProfile"("userId");

-- CreateIndex
CREATE INDEX "Innovation_ownerId_idx" ON "Innovation"("ownerId");

-- CreateIndex
CREATE INDEX "Innovation_status_idx" ON "Innovation"("status");

-- CreateIndex
CREATE INDEX "Innovation_sector_idx" ON "Innovation"("sector");

-- CreateIndex
CREATE INDEX "Milestone_innovationId_idx" ON "Milestone"("innovationId");

-- CreateIndex
CREATE INDEX "Investment_investorId_idx" ON "Investment"("investorId");

-- CreateIndex
CREATE INDEX "Investment_innovationId_idx" ON "Investment"("innovationId");

-- CreateIndex
CREATE INDEX "DiligenceItem_innovationId_idx" ON "DiligenceItem"("innovationId");

-- CreateIndex
CREATE INDEX "CashFlowEntry_innovationId_idx" ON "CashFlowEntry"("innovationId");

-- CreateIndex
CREATE INDEX "Endorsement_innovationId_idx" ON "Endorsement"("innovationId");

-- CreateIndex
CREATE INDEX "GpsEntry_userId_idx" ON "GpsEntry"("userId");

-- CreateIndex
CREATE INDEX "ChallengeBrief_authorId_idx" ON "ChallengeBrief"("authorId");

-- CreateIndex
CREATE INDEX "ChallengeBrief_status_idx" ON "ChallengeBrief"("status");

-- CreateIndex
CREATE INDEX "ChallengeResponse_briefId_idx" ON "ChallengeResponse"("briefId");

-- CreateIndex
CREATE INDEX "ChallengeResponse_responderId_idx" ON "ChallengeResponse"("responderId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeResponse_briefId_responderId_key" ON "ChallengeResponse"("briefId", "responderId");

-- CreateIndex
CREATE INDEX "GpsEvidence_gpsEntryId_idx" ON "GpsEvidence"("gpsEntryId");

-- CreateIndex
CREATE INDEX "GpsEndorsement_gpsEntryId_idx" ON "GpsEndorsement"("gpsEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "GpsEndorsement_gpsEntryId_endorserId_key" ON "GpsEndorsement"("gpsEntryId", "endorserId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "Appointment_practitionerId_idx" ON "Appointment"("practitionerId");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_dateTime_idx" ON "Appointment"("dateTime");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRecord_appointmentId_key" ON "BillingRecord"("appointmentId");

-- CreateIndex
CREATE INDEX "BillingRecord_paymentStatus_idx" ON "BillingRecord"("paymentStatus");

-- CreateIndex
CREATE INDEX "AdverseDrugReport_drugName_idx" ON "AdverseDrugReport"("drugName");

-- CreateIndex
CREATE INDEX "AdverseDrugReport_createdAt_idx" ON "AdverseDrugReport"("createdAt");

-- CreateIndex
CREATE INDEX "AdverseDrugReport_archivedAt_idx" ON "AdverseDrugReport"("archivedAt");

-- CreateIndex
CREATE INDEX "ProductFeedback_productName_idx" ON "ProductFeedback"("productName");

-- CreateIndex
CREATE INDEX "ProductFeedback_innovationId_idx" ON "ProductFeedback"("innovationId");

-- CreateIndex
CREATE INDEX "ProductFeedback_rating_idx" ON "ProductFeedback"("rating");

-- CreateIndex
CREATE INDEX "ProductFeedback_createdAt_idx" ON "ProductFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "ProductFeedback_archivedAt_idx" ON "ProductFeedback"("archivedAt");

-- CreateIndex
CREATE INDEX "PatientNote_patientId_idx" ON "PatientNote"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "HubPatient_patientCode_key" ON "HubPatient"("patientCode");

-- CreateIndex
CREATE INDEX "HubPatient_practitionerId_idx" ON "HubPatient"("practitionerId");

-- CreateIndex
CREATE INDEX "HubPatient_name_idx" ON "HubPatient"("name");

-- CreateIndex
CREATE INDEX "Insurer_createdById_idx" ON "Insurer"("createdById");

-- CreateIndex
CREATE INDEX "Insurer_isSystem_idx" ON "Insurer"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_practitionerId_idx" ON "Invoice"("practitionerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_serviceDate_idx" ON "Invoice"("serviceDate");

-- CreateIndex
CREATE INDEX "InvoicePayer_invoiceId_idx" ON "InvoicePayer"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayer_status_idx" ON "InvoicePayer"("status");

-- CreateIndex
CREATE INDEX "InvoicePayer_dueDate_idx" ON "InvoicePayer"("dueDate");

-- CreateIndex
CREATE INDEX "PaymentReminder_invoicePayerId_idx" ON "PaymentReminder"("invoicePayerId");

-- CreateIndex
CREATE INDEX "PaymentReminder_createdAt_idx" ON "PaymentReminder"("createdAt");

-- CreateIndex
CREATE INDEX "Debate_type_idx" ON "Debate"("type");

-- CreateIndex
CREATE INDEX "Debate_status_idx" ON "Debate"("status");

-- CreateIndex
CREATE INDEX "Debate_initiatorId_idx" ON "Debate"("initiatorId");

-- CreateIndex
CREATE INDEX "Debate_featured_idx" ON "Debate"("featured");

-- CreateIndex
CREATE INDEX "BriefPurchase_debateId_idx" ON "BriefPurchase"("debateId");

-- CreateIndex
CREATE INDEX "BriefPurchase_status_idx" ON "BriefPurchase"("status");

-- CreateIndex
CREATE INDEX "BriefPurchase_providerReference_idx" ON "BriefPurchase"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "BriefPurchase_userId_debateId_key" ON "BriefPurchase"("userId", "debateId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorMandate_userId_key" ON "InvestorMandate"("userId");

-- CreateIndex
CREATE INDEX "InvestorMandate_active_idx" ON "InvestorMandate"("active");

-- CreateIndex
CREATE INDEX "DebateContribution_debateId_idx" ON "DebateContribution"("debateId");

-- CreateIndex
CREATE INDEX "DebateContribution_authorId_idx" ON "DebateContribution"("authorId");

-- CreateIndex
CREATE INDEX "DebateContribution_moderationStatus_idx" ON "DebateContribution"("moderationStatus");

-- CreateIndex
CREATE INDEX "DebateStance_debateId_idx" ON "DebateStance"("debateId");

-- CreateIndex
CREATE UNIQUE INDEX "DebateStance_debateId_userId_key" ON "DebateStance"("debateId", "userId");

-- CreateIndex
CREATE INDEX "ContributionUpvote_contributionId_idx" ON "ContributionUpvote"("contributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContributionUpvote_contributionId_userId_key" ON "ContributionUpvote"("contributionId", "userId");

-- CreateIndex
CREATE INDEX "VaultAccessRequest_innovationId_idx" ON "VaultAccessRequest"("innovationId");

-- CreateIndex
CREATE INDEX "VaultAccessRequest_requesterId_idx" ON "VaultAccessRequest"("requesterId");

-- CreateIndex
CREATE INDEX "VaultAccessRequest_status_idx" ON "VaultAccessRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VaultAccessRequest_innovationId_requesterId_key" ON "VaultAccessRequest"("innovationId", "requesterId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceVendor_userId_key" ON "MarketplaceVendor"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceVendor_status_idx" ON "MarketplaceVendor"("status");

-- CreateIndex
CREATE INDEX "MarketplaceVendor_primaryPillar_idx" ON "MarketplaceVendor"("primaryPillar");

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_idx" ON "VendorDocument"("vendorId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_vendorId_idx" ON "MarketplaceListing"("vendorId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_pillar_idx" ON "MarketplaceListing"("pillar");

-- CreateIndex
CREATE INDEX "MarketplaceListing_isPublished_idx" ON "MarketplaceListing"("isPublished");

-- CreateIndex
CREATE INDEX "MarketplaceListing_isPaxCertified_idx" ON "MarketplaceListing"("isPaxCertified");

-- CreateIndex
CREATE INDEX "MarketplaceListing_moderationStatus_idx" ON "MarketplaceListing"("moderationStatus");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_vendorId_idx" ON "MarketplaceTransaction"("vendorId");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_listingId_idx" ON "MarketplaceTransaction"("listingId");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_recordedById_idx" ON "MarketplaceTransaction"("recordedById");

-- CreateIndex
CREATE INDEX "MarketplaceReview_listingId_idx" ON "MarketplaceReview"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceReview_listingId_reviewerId_key" ON "MarketplaceReview"("listingId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceBuyer_userId_key" ON "MarketplaceBuyer"("userId");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_idx" ON "VerificationRequest"("userId");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

-- CreateIndex
CREATE INDEX "VerificationRequest_requestedLevel_idx" ON "VerificationRequest"("requestedLevel");

-- CreateIndex
CREATE INDEX "VerificationDocument_requestId_idx" ON "VerificationDocument"("requestId");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_consentType_idx" ON "ConsentRecord"("userId", "consentType");

-- CreateIndex
CREATE INDEX "ConsentRecord_grantedAt_idx" ON "ConsentRecord"("grantedAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerProfile" ADD CONSTRAINT "PractitionerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Innovation" ADD CONSTRAINT "Innovation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceItem" ADD CONSTRAINT "DiligenceItem_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowEntry" ADD CONSTRAINT "CashFlowEntry_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsEntry" ADD CONSTRAINT "GpsEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeBrief" ADD CONSTRAINT "ChallengeBrief_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeResponse" ADD CONSTRAINT "ChallengeResponse_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ChallengeBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeResponse" ADD CONSTRAINT "ChallengeResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeResponse" ADD CONSTRAINT "ChallengeResponse_gpsEntryId_fkey" FOREIGN KEY ("gpsEntryId") REFERENCES "GpsEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsEvidence" ADD CONSTRAINT "GpsEvidence_gpsEntryId_fkey" FOREIGN KEY ("gpsEntryId") REFERENCES "GpsEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsEndorsement" ADD CONSTRAINT "GpsEndorsement_gpsEntryId_fkey" FOREIGN KEY ("gpsEntryId") REFERENCES "GpsEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsEndorsement" ADD CONSTRAINT "GpsEndorsement_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdverseDrugReport" ADD CONSTRAINT "AdverseDrugReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFeedback" ADD CONSTRAINT "ProductFeedback_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientNote" ADD CONSTRAINT "PatientNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPatient" ADD CONSTRAINT "HubPatient_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insurer" ADD CONSTRAINT "Insurer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_hubPatientId_fkey" FOREIGN KEY ("hubPatientId") REFERENCES "HubPatient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayer" ADD CONSTRAINT "InvoicePayer_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayer" ADD CONSTRAINT "InvoicePayer_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_invoicePayerId_fkey" FOREIGN KEY ("invoicePayerId") REFERENCES "InvoicePayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_devilsAdvocateId_fkey" FOREIGN KEY ("devilsAdvocateId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefPurchase" ADD CONSTRAINT "BriefPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefPurchase" ADD CONSTRAINT "BriefPurchase_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorMandate" ADD CONSTRAINT "InvestorMandate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateContribution" ADD CONSTRAINT "DebateContribution_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateContribution" ADD CONSTRAINT "DebateContribution_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateStance" ADD CONSTRAINT "DebateStance_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateStance" ADD CONSTRAINT "DebateStance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionUpvote" ADD CONSTRAINT "ContributionUpvote_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "DebateContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionUpvote" ADD CONSTRAINT "ContributionUpvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAccessRequest" ADD CONSTRAINT "VaultAccessRequest_innovationId_fkey" FOREIGN KEY ("innovationId") REFERENCES "Innovation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAccessRequest" ADD CONSTRAINT "VaultAccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceVendor" ADD CONSTRAINT "MarketplaceVendor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "MarketplaceVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "MarketplaceVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceTransaction" ADD CONSTRAINT "MarketplaceTransaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceTransaction" ADD CONSTRAINT "MarketplaceTransaction_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "MarketplaceVendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceTransaction" ADD CONSTRAINT "MarketplaceTransaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBuyer" ADD CONSTRAINT "MarketplaceBuyer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
