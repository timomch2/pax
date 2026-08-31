// Marketplace helper constants & types

export const PILLAR_LABELS: Record<string, string> = {
  DIGITAL_TOOLS_IP: 'Digital Public Health Tools & IP',
  HEALTH_SECURITY_ANALYTICS: 'Global Health Security & Analytics',
  LAB_RADIOLOGICAL_HARDWARE: 'Laboratory & Radiological Hardware',
  PHARMA_DIRECTORY: 'Pharmaceuticals & Health Products Directory',
};

export const PILLAR_DESCRIPTIONS: Record<string, string> = {
  DIGITAL_TOOLS_IP: 'Diagnostic AI, clinical algorithms, LIMS, PACS, practice-management software, and encrypted IP & blueprints.',
  HEALTH_SECURITY_ANALYTICS: 'Real-time surveillance platforms, predictive epidemiological modelling, pharmacovigilance, EOC dashboards, and expert advisory services.',
  LAB_RADIOLOGICAL_HARDWARE: 'PCR machines, analysers, centrifuges, cold-chain units, X-ray/CT/MRI equipment, and accredited facility profiles. B2B only.',
  PHARMA_DIRECTORY: 'Pharmacy directory profiles, OTC wellness supplies, and institutional health products. No direct prescription drug sales.',
};

export const PILLAR_ICONS: Record<string, string> = {
  DIGITAL_TOOLS_IP: 'Cpu',
  HEALTH_SECURITY_ANALYTICS: 'ShieldCheck',
  LAB_RADIOLOGICAL_HARDWARE: 'Microscope',
  PHARMA_DIRECTORY: 'Pill',
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  PRODUCT: 'Product',
  SERVICE: 'Service',
  SOFTWARE: 'Software / SaaS',
  FACILITY_PROFILE: 'Facility Profile',
  DIRECTORY_PROFILE: 'Directory Profile',
};

export const VENDOR_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  FROZEN: 'Frozen',
};

export const BUYER_ENTITY_LABELS: Record<string, string> = {
  PUBLIC_HEALTH_AGENCY: 'Public Health Agency',
  HOSPITAL_CLINIC: 'Hospital / Clinic',
  ACCREDITED_LAB: 'Accredited Laboratory',
  NGO_DONOR: 'NGO / Donor',
  RESEARCH_CENTER: 'Research Center',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  NATIONAL_LICENSE: 'National Operating License / Permit',
  ORIGIN_PREQUALIFICATION: 'Country of Origin Prequalification (FDA / CE-IVD / WHO)',
  LOCAL_AUTHORIZATION: 'Local Market Import & Sales Authorization',
  DEALER_LETTER: 'Manufacturer Dealership Authorization Letter',
  RADIATION_CLEARANCE: 'Radiation Safety Clearance Certificate',
  FACILITY_ACCREDITATION: 'Facility Accreditation Certificate',
};

export const LEGAL_INITIALS = [
  { key: 'acceptedNoDirectDrugSales', label: 'No Direct Drug Sales', description: 'I confirm that no direct prescription pharmaceutical sales will be conducted on PAX.' },
  { key: 'acceptedPureIntermediary', label: 'Pure Intermediary Model', description: 'I accept that PAX operates as a Pure Passive Intermediary. I (the vendor) handle all sales, shipping, warranties, and customer support directly with buyers.' },
  { key: 'acceptedB2BTestKitRestriction', label: 'B2B Test Kit Restriction', description: 'I accept the B2B-only restriction for test kits and laboratory consumables. No direct-to-consumer (B2C) sales of test kits are permitted.' },
  { key: 'acceptedFullIndemnification', label: 'Complete Legal Indemnification', description: 'I assume 100% civil, legal, criminal, technical, and warranty liability for all products and services I list. I agree to defend, indemnify, and hold harmless PAX, its directors, officers, and parent entities against any claims, lawsuits, injuries, product liability demands, or regulatory fines resulting from my products or services.' },
  { key: 'acceptedAIModeration', label: 'AI Language Moderation', description: 'I accept that all product listings, directory profiles, and reviews will be subject to automated AI content and language moderation to enforce compliance and eliminate unverified medical claims.' },
] as const;

export const REGULATORY_DISCLAIMER = 'Products and services listed on PAX are community-reviewed and provided for information and connection purposes only. They are not clinical endorsements by PAX, and regulatory approval remains the responsibility of the relevant national authority. PAX operates as a platform and marketplace — not as a healthcare provider, pharmacy, or clinical authority. All price negotiations, sales contracts, payments, warranties, fulfilment, and after-sales support occur directly between the buyer and the seller.';

// Pillar-specific listing types
export const PILLAR_LISTING_TYPES: Record<string, string[]> = {
  DIGITAL_TOOLS_IP: ['SOFTWARE', 'PRODUCT', 'SERVICE'],
  HEALTH_SECURITY_ANALYTICS: ['SOFTWARE', 'SERVICE', 'PRODUCT'],
  LAB_RADIOLOGICAL_HARDWARE: ['PRODUCT', 'FACILITY_PROFILE'],
  PHARMA_DIRECTORY: ['DIRECTORY_PROFILE', 'PRODUCT'],
};

// Required documents per pillar
export const PILLAR_REQUIRED_DOCS: Record<string, string[]> = {
  DIGITAL_TOOLS_IP: ['NATIONAL_LICENSE'],
  HEALTH_SECURITY_ANALYTICS: ['NATIONAL_LICENSE'],
  LAB_RADIOLOGICAL_HARDWARE: ['NATIONAL_LICENSE', 'ORIGIN_PREQUALIFICATION', 'LOCAL_AUTHORIZATION'],
  PHARMA_DIRECTORY: ['NATIONAL_LICENSE', 'LOCAL_AUTHORIZATION'],
};

// Optional documents (vendor can upload if applicable)
export const OPTIONAL_DOCS = ['DEALER_LETTER', 'RADIATION_CLEARANCE', 'FACILITY_ACCREDITATION'];
