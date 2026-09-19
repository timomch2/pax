export const dynamic = 'force-dynamic';

import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { generateAssetUploadUrl } from '@/lib/s3';
import { getBucketConfig } from '@/lib/aws-config';
import { safeUploadName, UPLOAD_POLICIES, validateUploadPolicy } from '@/lib/upload-policy';
import { enforceRateLimit } from '@/lib/rate-limit';

const purposes = Object.keys(UPLOAD_POLICIES) as [keyof typeof UPLOAD_POLICIES, ...(keyof typeof UPLOAD_POLICIES)[]];
const schema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(200),
  size: z.number().int().min(1),
  purpose: z.enum(purposes),
  checksumSha256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional().nullable(),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requirePermission('upload.create', {}, request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const limited = await enforceRateLimit(request, { name: 'upload-presign', limit: 30, windowSeconds: 60 * 60 }, auth.userId);
    if (!limited.allowed) return NextResponse.json({ error: 'Too many upload requests' }, { status: 429 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid upload request', details: parsed.error.flatten() }, { status: 400 });
    if (['TALENT_RESUME', 'TALENT_DOCUMENT'].includes(parsed.data.purpose) && !parsed.data.checksumSha256) return NextResponse.json({ error: 'A document checksum is required' }, { status: 400 });
    const policyError = validateUploadPolicy(parsed.data);
    if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });

    const assetId = randomUUID();
    const { folderPrefix } = getBucketConfig();
    const objectKey = `${folderPrefix}uploads/${auth.userId}/${assetId}/${safeUploadName(parsed.data.fileName)}`;
    const retainedUntil = new Date(Date.now() + UPLOAD_POLICIES[parsed.data.purpose].retentionDays * 24 * 60 * 60 * 1000);
    const asset = await prisma.uploadAsset.create({
      data: {
        id: assetId,
        ownerId: auth.userId,
        purpose: parsed.data.purpose,
        originalFileName: parsed.data.fileName,
        objectKey,
        expectedContentType: parsed.data.contentType,
        expectedSize: parsed.data.size,
        expectedChecksum: parsed.data.checksumSha256?.toLowerCase() || null,
        retainedUntil,
      },
    });
    try {
      const signed = await generateAssetUploadUrl({
        objectKey,
        contentType: asset.expectedContentType,
        assetId: asset.id,
        ownerId: asset.ownerId,
        checksumSha256Base64: asset.expectedChecksum ? Buffer.from(asset.expectedChecksum, 'hex').toString('base64') : undefined,
      });
      await prisma.uploadAssetAccessLog.create({ data: { assetId: asset.id, actorId: auth.userId, action: 'UPLOAD_URL_CREATED' } });
      return NextResponse.json({ assetId: asset.id, uploadUrl: signed.uploadUrl, requiredHeaders: signed.requiredHeaders, expiresIn: 3600 });
    } catch (error) {
      await prisma.uploadAsset.update({ where: { id: asset.id }, data: { status: 'REJECTED', scanResult: 'Presign generation failed' } });
      throw error;
    }
  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }
}
