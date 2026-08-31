import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectTaggingCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

// Content types that are safe/expected to render inline in the browser.
export function shouldServeInline(contentType: string): boolean {
  if (!contentType) return false;
  return (
    contentType.startsWith('image/') ||
    contentType === 'application/pdf' ||
    contentType.startsWith('text/')
  );
}

// Generate a presigned URL the client can PUT a file to.
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; cloudStoragePath: string }> {
  const s3 = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cloudStoragePath = `${folderPrefix}uploads/${Date.now()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return { uploadUrl, cloudStoragePath };
}

export async function generateAssetUploadUrl(input: {
  objectKey: string;
  contentType: string;
  assetId: string;
  ownerId: string;
  checksumSha256Base64?: string;
}): Promise<{ uploadUrl: string; requiredHeaders: Record<string, string> }> {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  const metadata = { 'asset-id': input.assetId, 'owner-id': input.ownerId };
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: input.objectKey,
    ContentType: input.contentType,
    Metadata: metadata,
    ChecksumSHA256: input.checksumSha256Base64,
  });
  const requiredHeaders: Record<string, string> = {
    'Content-Type': input.contentType,
    'x-amz-meta-asset-id': input.assetId,
    'x-amz-meta-owner-id': input.ownerId,
  };
  if (input.checksumSha256Base64) requiredHeaders['x-amz-checksum-sha256'] = input.checksumSha256Base64;
  return { uploadUrl: await getSignedUrl(s3, command, { expiresIn: 3600 }), requiredHeaders };
}

export async function headFile(cloudStoragePath: string) {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  return s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: cloudStoragePath, ChecksumMode: 'ENABLED' }));
}

export async function getMalwareScanStatus(cloudStoragePath: string): Promise<string | null> {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  const result = await s3.send(new GetObjectTaggingCommand({ Bucket: bucketName, Key: cloudStoragePath }));
  return result.TagSet?.find((tag) => tag.Key === 'GuardDutyMalwareScanStatus')?.Value || null;
}

// Generate a signed URL to download/view a private file.
export async function getFileUrl(
  cloudStoragePath: string,
  contentType: string,
  fileName?: string,
): Promise<string> {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();

  const disposition = shouldServeInline(contentType)
    ? 'inline'
    : `attachment; filename="${(fileName || 'download').replace(/"/g, '')}"`;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
    ResponseContentDisposition: disposition,
    ResponseContentType: contentType || undefined,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function deleteFile(cloudStoragePath: string): Promise<void> {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloudStoragePath,
  });

  await s3.send(command);
}
