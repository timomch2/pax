// Human-friendly labels + badge styles for PAX enums.

export const STAGE_LABELS: Record<string, string> = {
  IDEA: 'Idea',
  PROTOTYPE: 'Prototype',
  PILOT: 'Pilot',
  SCALING: 'Scaling',
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  COMMUNITY_VALIDATED: 'Community Validated',
  INVESTOR_READY: 'Investor Ready',
  FUNDED: 'Funded',
};

export const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-white/10 text-white/70',
  SUBMITTED: 'bg-blue-500/15 text-blue-300',
  UNDER_REVIEW: 'bg-blue-500/15 text-blue-300',
  COMMUNITY_VALIDATED: 'bg-[#8B7FD4]/20 text-[#b6acef]',
  INVESTOR_READY: 'bg-[#F59E0B]/15 text-[#FBBF24]',
  FUNDED: 'bg-[#2D9B94]/20 text-[#2ABFB0]',
};

export const MILESTONE_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted for Review',
  VERIFIED: 'Verified',
  RELEASED: 'Funds Released',
};

export const MILESTONE_BADGE: Record<string, string> = {
  PENDING: 'bg-white/10 text-white/70',
  IN_PROGRESS: 'bg-[#F59E0B]/15 text-[#FBBF24]',
  SUBMITTED: 'bg-blue-500/15 text-blue-300',
  VERIFIED: 'bg-[#2D9B94]/20 text-[#2ABFB0]',
  RELEASED: 'bg-[#2D9B94]/30 text-[#2ABFB0]',
};

export const DILIGENCE_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  VERIFIED: 'Verified',
  FLAGGED: 'Flagged',
};

export const DILIGENCE_BADGE: Record<string, string> = {
  PENDING: 'bg-white/10 text-white/70',
  SUBMITTED: 'bg-[#F59E0B]/15 text-[#FBBF24]',
  VERIFIED: 'bg-[#2D9B94]/20 text-[#2ABFB0]',
  FLAGGED: 'bg-[#DC2626]/20 text-red-300',
};

export const INVESTMENT_LABELS: Record<string, string> = {
  INTERESTED: 'Interested',
  DUE_DILIGENCE: 'Due Diligence',
  COMMITTED: 'Committed',
  DISBURSING: 'Disbursing',
  COMPLETED: 'Funded',
  DECLINED: 'Declined',
};

export const INVESTMENT_BADGE: Record<string, string> = {
  INTERESTED: 'bg-blue-500/15 text-blue-300',
  DUE_DILIGENCE: 'bg-[#8B7FD4]/20 text-[#b6acef]',
  COMMITTED: 'bg-[#F59E0B]/15 text-[#FBBF24]',
  DISBURSING: 'bg-[#F59E0B]/15 text-[#FBBF24]',
  COMPLETED: 'bg-[#2D9B94]/20 text-[#2ABFB0]',
  DECLINED: 'bg-white/10 text-white/50',
};

// Health / public-health sectors for Innovation Hub 2-Pager Briefs.
export const INNOVATION_SECTORS: string[] = [
  'Maternal & Child Health',
  'Infectious Disease',
  'Diagnostics & Devices',
  'Digital Health',
  'Mental Health',
  'Nutrition',
  'WASH',
  'Non-Communicable Disease',
  'Health Systems',
  'Supply Chain & Cold Chain',
  'Pharmaceuticals',
  'Other',
];

// Ordered validation pipeline (excludes DRAFT, which is pre-submission).
export const VALIDATION_PIPELINE: { key: string; label: string }[] = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'COMMUNITY_VALIDATED', label: 'Community Validated' },
  { key: 'INVESTOR_READY', label: 'Investor Ready' },
  { key: 'FUNDED', label: 'Funded' },
];

// Index of a status within the pipeline (-1 for DRAFT / unknown).
export function pipelineIndex(status: string): number {
  return VALIDATION_PIPELINE.findIndex((s) => s.key === status);
}

// IP Protection levels for Innovation Hub.
export const IP_PROTECTION_LEVELS: { key: string; label: string }[] = [
  { key: 'PRE_PATENT', label: 'Pre-Patent / Stealth Mode' },
  { key: 'PROVISIONAL_FILED', label: 'Provisional Patent Filed' },
  { key: 'PATENT_GRANTED', label: 'Full Patent Granted / Pending' },
  { key: 'TRADE_SECRET', label: 'Trade Secret / Proprietary Know-How' },
  { key: 'OPEN_SOURCE', label: 'Open Source / Creative Commons' },
];

export const IP_PROTECTION_BADGE: Record<string, string> = {
  PRE_PATENT: 'bg-[#F59E0B]/15 text-[#FBBF24]',
  PROVISIONAL_FILED: 'bg-[#8B7FD4]/20 text-[#b6acef]',
  PATENT_GRANTED: 'bg-[#2D9B94]/20 text-[#2ABFB0]',
  TRADE_SECRET: 'bg-white/10 text-white/70',
  OPEN_SOURCE: 'bg-blue-500/15 text-blue-300',
};

// Revenue model options for Dual-Bottom-Line.
export const REVENUE_MODELS: { key: string; label: string }[] = [
  { key: 'LICENSING', label: 'Licensing' },
  { key: 'SAAS', label: 'SaaS' },
  { key: 'ROYALTY', label: 'Manufacturing Royalties' },
  { key: 'MANUFACTURING', label: 'Direct Manufacturing & Sales' },
  { key: 'B2B', label: 'B2B Sales' },
  { key: 'B2C', label: 'B2C Direct' },
  { key: 'OTHER', label: 'Other' },
];

// Vault access request statuses.
export const VAULT_ACCESS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  NDA_SIGNED: 'NDA Signed',
  APPROVED: 'Approved',
  DENIED: 'Denied',
  REVOKED: 'Revoked',
};

export const VAULT_ACCESS_BADGE: Record<string, string> = {
  REQUESTED: 'bg-[#F59E0B]/15 text-[#FBBF24]',
  NDA_SIGNED: 'bg-[#8B7FD4]/20 text-[#b6acef]',
  APPROVED: 'bg-[#2D9B94]/20 text-[#2ABFB0]',
  DENIED: 'bg-[#DC2626]/15 text-[#f87171]',
  REVOKED: 'bg-white/10 text-white/50',
};
// Investor mandate — target geographies for the Neural Matchmaking Pipeline.
export const INVESTOR_GEOGRAPHIES: string[] = [
  'East Africa',
  'West Africa',
  'Southern Africa',
  'Central Africa',
  'North Africa',
  'Sub-Saharan Africa',
  'Pan-African',
  'Middle East',
  'South Asia',
  'Southeast Asia',
  'East Asia & Pacific',
  'Latin America & Caribbean',
  'Europe',
  'North America',
  'Global',
];

// Funding stages an investor mandate can target (mirrors InnovationStage).
export const MANDATE_STAGES: { key: string; label: string }[] = [
  { key: 'IDEA', label: 'Idea / Grant' },
  { key: 'PROTOTYPE', label: 'Prototype / Pre-Seed' },
  { key: 'PILOT', label: 'Pilot / Seed' },
  { key: 'SCALING', label: 'Scaling / Series A+' },
];
export const PRACTICE_EVENT_KIND_LABELS: Record<string, string> = { APPOINTMENT: 'Client appointment', CONSULTING: 'Facility consulting session', MEETING: 'Professional meeting' };
export const PRACTICE_EVENT_STATUS_LABELS: Record<string, string> = { SCHEDULED: 'Scheduled', COMPLETED: 'Completed', CANCELLED: 'Cancelled', NO_SHOW: 'No-show' };
export const PRACTICE_TEAM_LABELS: Record<string, string> = { RECEPTION: 'Reception', FINANCE: 'Finance' };

export const TALENT_LABELS: Record<string, string> = {
  PRIVATE: 'Private', RECRUITERS: 'Verified recruiters', PUBLIC: 'Public', PERSONAL: 'Personal hiring', ORGANIZATION: 'Company or institution',
  DRAFT: 'Draft', PENDING: 'Awaiting verification', VERIFIED: 'Identity verified', SUSPENDED: 'Suspended', REJECTED: 'Rejected',
  OWNER: 'Owner', ADMIN: 'Administrator', RECRUITER: 'Recruiter', REVIEWER: 'Reviewer', PUBLISHED: 'Published', CLOSED: 'Applications closed', ARCHIVED: 'Archived',
  FULL_TIME: 'Full time', PART_TIME: 'Part time', CONTRACT: 'Contract', CONSULTANCY: 'Consultancy', INTERNSHIP: 'Internship', VOLUNTEER: 'Volunteer',
  ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote', REQUIRED: 'Required', OPTIONAL: 'Optional', HIDDEN: 'Not requested',
  SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under review', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFERED: 'Offered', HIRED: 'Hired', WITHDRAWN: 'Withdrawn',
  INVITED: 'Invitation pending', ACCEPTED: 'Accepted', DECLINED: 'Declined', CLEAN: 'Ready', PENDING_UPLOAD: 'Uploading', QUARANTINED: 'Security scan pending', SCANNING: 'Scanning', EXPIRED: 'Expired',
  SHORT_TEXT: 'Short answer', LONG_TEXT: 'Long answer', YES_NO: 'Yes or no', SINGLE_CHOICE: 'Single choice',
  HOUR: 'Hour', DAY: 'Day', WEEK: 'Week', MONTH: 'Month', YEAR: 'Year', PROJECT: 'Project',
};
export function talentLabel(value: string) { return TALENT_LABELS[value] || value; }

export const SERVICE_STATE_LABEL: Record<string, string> = {
  ENABLED: 'Enabled', DISABLED: 'Disabled', NOT_ENABLED: 'Not enabled',
};
export const SERVICE_ACCESS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', SETUP_REQUIRED: 'Setup required', LIMITED: 'Limited access',
  UNAVAILABLE: 'Unavailable', ACCOUNT_RESTRICTED: 'Account restricted',
};
export const SERVICE_SOURCE_LABEL: Record<string, string> = {
  SELF: 'Chosen by you', LEGACY: 'Existing service account',
};
