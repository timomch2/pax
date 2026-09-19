export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { headFile } from '@/lib/s3';
import { TalentError } from '@/lib/talent-access';
import { validateTalentCloudDocument } from '@/lib/talent-documents';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const asset = await prisma.uploadAsset.findUnique({ where: { id: params.id } });
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const auth = await requirePermission('upload.create', { ownerId: asset.ownerId, resourceId: asset.id, entityType: 'UploadAsset' }, request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (asset.status !== 'PENDING_UPLOAD') return NextResponse.json({ error: 'Upload is not pending' }, { status: 409 });

  try {
    const object = await headFile(asset.objectKey);
    const actualSize = Number(object.ContentLength ?? -1);
    const actualType = object.ContentType || '';
    const metadataMatches = object.Metadata?.['asset-id'] === asset.id && object.Metadata?.['owner-id'] === asset.ownerId;
    const checksum = object.ChecksumSHA256 ? Buffer.from(object.ChecksumSHA256, 'base64').toString('hex') : null;
    const valid = actualSize === asset.expectedSize && actualType === asset.expectedContentType && metadataMatches && (!asset.expectedChecksum || checksum === asset.expectedChecksum);
    if (!valid) {
      await prisma.uploadAsset.update({ where: { id: asset.id }, data: { status: 'REJECTED', actualSize, actualContentType: actualType || null, actualChecksum: checksum, objectEtag: object.ETag || null, scanResult: 'Object metadata did not match the upload declaration' } });
      await prisma.uploadAssetAccessLog.create({ data: { assetId: asset.id, actorId: auth.userId, action: 'UPLOAD_COMPLETED', outcome: 'DENIED' } });
      return NextResponse.json({ error: 'Uploaded object did not match the declaration' }, { status: 400 });
    }
    const status = process.env.NODE_ENV !== 'production' && !process.env.AWS_GUARDDUTY_MALWARE_PROTECTION ? 'CLEAN' : 'QUARANTINED';
    const talentDocument = ['TALENT_RESUME', 'TALENT_DOCUMENT'].includes(asset.purpose);
    if (talentDocument) await validateTalentCloudDocument(asset.objectKey, actualType, actualSize);
    await prisma.uploadAsset.update({
      where: { id: asset.id },
      data: { status, actualSize, actualContentType: actualType, actualChecksum: checksum, objectEtag: object.ETag || null, completedAt: new Date(), ...(talentDocument ? { contentValidatedAt: new Date() } : {}), ...(status === 'CLEAN' ? { scannedAt: new Date(), scanProvider: 'LOCAL_DEVELOPMENT_BYPASS' } : { scanProvider: 'AWS_GUARDDUTY_S3' }) },
    });
    await prisma.uploadAssetAccessLog.create({ data: { assetId: asset.id, actorId: auth.userId, action: 'UPLOAD_COMPLETED' } });
    return NextResponse.json({ assetId: asset.id, status });
  } catch (error) {
    if (error instanceof TalentError) {
      await prisma.uploadAsset.updateMany({ where: { id: asset.id, status: 'PENDING_UPLOAD' }, data: { status: 'REJECTED', scanResult: 'Document format validation failed', retainedUntil: new Date() } });
    }
    console.error('Upload completion error:', error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({ error: 'Uploaded object could not be verified' }, { status: 400 });
  }
}
