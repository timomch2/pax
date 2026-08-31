export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { z } from 'zod';

const attachSchema = z.object({ uploadAssetId: z.string().uuid() }).strict();

// Attach an uploaded evidence file to a GPS entry.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const entry = await prisma.gpsEntry.findUnique({ where: { id: params.id } });
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const auth = await requirePermission('gps.evidence.manage', { ownerId: entry.userId, resourceId: entry.id, entityType: 'GpsEntry' }, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const parsed = attachSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid upload asset' }, { status: 400 });
    const asset = await prisma.uploadAsset.findFirst({ where: { id: parsed.data.uploadAssetId, ownerId: auth.userId, purpose: 'GPS_EVIDENCE', status: 'CLEAN' } });
    if (!asset) return NextResponse.json({ error: 'Upload is unavailable, unsafe, or not owned by you' }, { status: 400 });
    const evidence = await prisma.gpsEvidence.create({
      data: {
        gpsEntryId: entry.id,
        fileName: asset.originalFileName,
        cloudStoragePath: asset.objectKey,
        contentType: asset.actualContentType || asset.expectedContentType,
        uploadAssetId: asset.id,
        isPublic: false,
      },
      select: { id: true, fileName: true, contentType: true, createdAt: true },
    });
    return NextResponse.json({ evidence });
  } catch (error: any) {
    console.error('Evidence attach error:', error);
    return NextResponse.json({ error: 'Failed to attach evidence' }, { status: 500 });
  }
}

// Remove an evidence file from a GPS entry.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const evidenceId = searchParams.get('evidenceId');
    if (!evidenceId) {
      return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
    }
    const evidence = await prisma.gpsEvidence.findUnique({
      where: { id: evidenceId },
      include: { gpsEntry: { select: { id: true, userId: true } } },
    });
    if (!evidence || evidence.gpsEntryId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const auth = await requirePermission('gps.evidence.manage', { ownerId: evidence.gpsEntry.userId, resourceId: evidence.id, entityType: 'GpsEvidence' }, req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    await prisma.gpsEvidence.delete({ where: { id: evidenceId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Evidence delete error:', error);
    return NextResponse.json({ error: 'Failed to delete evidence' }, { status: 500 });
  }
}
