import type { UploadPurpose } from '@prisma/client';

type UploadPolicy = { maxBytes: number; contentTypes: readonly string[]; extensions: readonly string[]; retentionDays: number };

const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
const DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;

export const UPLOAD_POLICIES: Record<UploadPurpose, UploadPolicy> = {
  PROFILE_IMAGE: { maxBytes: 5 * 1024 * 1024, contentTypes: ['image/jpeg', 'image/png'], extensions: ['jpg', 'jpeg', 'png'], retentionDays: 3650 },
  GPS_EVIDENCE: { maxBytes: 25 * 1024 * 1024, contentTypes: DOCUMENT_TYPES, extensions: DOCUMENT_EXTENSIONS, retentionDays: 2555 },
  INNOVATION_EVIDENCE: { maxBytes: 25 * 1024 * 1024, contentTypes: DOCUMENT_TYPES, extensions: DOCUMENT_EXTENSIONS, retentionDays: 2555 },
  VAULT_DOCUMENT: { maxBytes: 25 * 1024 * 1024, contentTypes: DOCUMENT_TYPES, extensions: DOCUMENT_EXTENSIONS, retentionDays: 2555 },
  VERIFICATION_DOCUMENT: { maxBytes: 10 * 1024 * 1024, contentTypes: DOCUMENT_TYPES, extensions: DOCUMENT_EXTENSIONS, retentionDays: 2555 },
  VENDOR_DOCUMENT: { maxBytes: 10 * 1024 * 1024, contentTypes: DOCUMENT_TYPES, extensions: DOCUMENT_EXTENSIONS, retentionDays: 2555 },
  SAFETY_ATTACHMENT: { maxBytes: 10 * 1024 * 1024, contentTypes: DOCUMENT_TYPES, extensions: DOCUMENT_EXTENSIONS, retentionDays: 3650 },
  TALENT_RESUME: { maxBytes: 10 * 1024 * 1024, contentTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], extensions: ['pdf', 'docx'], retentionDays: 365 },
  TALENT_DOCUMENT: { maxBytes: 10 * 1024 * 1024, contentTypes: [...DOCUMENT_TYPES, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], extensions: [...DOCUMENT_EXTENSIONS, 'docx'], retentionDays: 365 },
};

export function validateUploadPolicy(input: { purpose: UploadPurpose; fileName: string; contentType: string; size: number }): string | null {
  const policy = UPLOAD_POLICIES[input.purpose];
  const extension = input.fileName.split('.').pop()?.toLowerCase() || '';
  if (!policy.contentTypes.includes(input.contentType as never)) return 'File type is not allowed for this upload purpose';
  if (!policy.extensions.includes(extension as never)) return 'File extension is not allowed for this upload purpose';
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > policy.maxBytes) return `File size must be between 1 byte and ${policy.maxBytes} bytes`;
  return null;
}

export function safeUploadName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180);
}
