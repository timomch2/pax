export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFileUrl } from '@/lib/s3';
import { requirePermission } from '@/lib/authorization';

// Return a fresh signed download URL for an evidence file.
// Any authenticated member may view evidence attached to member profiles.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const evidence = await prisma.gpsEvidence.findUnique({ where: { id: params.id }, include: { gpsEntry: { select: { userId: true } }, uploadAsset: true } });
    if (!evidence) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const auth = await requirePermission('gps.evidence.read', evidence.isPublic ? {} : { ownerId: evidence.gpsEntry.userId, resourceId: evidence.id, entityType: 'GpsEvidence' }, _req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (evidence.uploadAsset && evidence.uploadAsset.status !== 'CLEAN') return NextResponse.json({ error: 'File is not available' }, { status: 423 });
    const url = await getFileUrl(evidence.cloudStoragePath, evidence.contentType, evidence.fileName);
    if (evidence.uploadAssetId) await prisma.uploadAssetAccessLog.create({ data: { assetId: evidence.uploadAssetId, actorId: auth.userId, action: 'DOWNLOAD_URL_CREATED' } });
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Evidence URL error:', error);
    return NextResponse.json({ error: 'Failed to get evidence URL' }, { status: 500 });
  }
}
