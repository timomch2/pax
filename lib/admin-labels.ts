// Client-safe display labels for the admin console (no server imports here).

export const ROLE_LABEL: Record<string, string> = {
  PRACTITIONER: 'Health Practitioner',
  INNOVATOR: 'Innovator / Researcher',
  INVESTOR: 'Investor / Funder',
  EMPLOYER: 'Employer / Organisation',
  POLICYMAKER: 'Policymaker / Government',
  PATIENT: 'Patient (legacy)',
  ADMIN: 'Administrator',
};

export const TIER_LABEL: Record<string, string> = {
  TIER1_BASIC: 'Basic (Free)',
  TIER2_PROFESSIONAL: 'Professional',
  TIER3_EXPERT: 'Expert',
};

export const INNOVATION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  COMMUNITY_VALIDATED: 'Community Validated',
  INVESTOR_READY: 'Investor Ready',
  FUNDED: 'Funded',
};

export const VAULT_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested',
  NDA_SIGNED: 'NDA Signed',
  APPROVED: 'Approved',
  DENIED: 'Denied',
  REVOKED: 'Revoked',
};
