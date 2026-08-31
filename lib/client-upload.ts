export type UploadPurposeValue =
  | 'PROFILE_IMAGE'
  | 'GPS_EVIDENCE'
  | 'INNOVATION_EVIDENCE'
  | 'VAULT_DOCUMENT'
  | 'VERIFICATION_DOCUMENT'
  | 'VENDOR_DOCUMENT'
  | 'SAFETY_ATTACHMENT'
  | 'TALENT_RESUME';

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadAsset(file: File, purpose: UploadPurposeValue): Promise<{ assetId: string; status: string }> {
  const checksumSha256 = hex(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
  const response = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size, purpose, checksumSha256 }),
  });
  const presign = await response.json();
  if (!response.ok) throw new Error(presign.error || 'Unable to prepare upload');
  const uploaded = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.requiredHeaders, body: file });
  if (!uploaded.ok) throw new Error('Cloud upload failed');
  const completed = await fetch(`/api/uploads/${presign.assetId}/complete`, { method: 'POST' });
  const result = await completed.json();
  if (!completed.ok) throw new Error(result.error || 'Upload verification failed');
  return result;
}
