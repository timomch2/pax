export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/authorization';
import { getFileUrl } from '@/lib/s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { authorizeUser } from '@/lib/authorization';
import { canReadTalentAsset } from '@/lib/talent-documents';
import { talentEnabled } from '@/lib/product-hosts';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const asset = await prisma.uploadAsset.findUnique({ where: { id: params.id } });
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let auth = await requirePermission('upload.read', { ownerId: asset.ownerId, resourceId: asset.id, entityType: 'UploadAsset' }, request);
  if (!auth.ok && talentEnabled() && await canReadTalentAsset(session.user.id, asset.id)) auth = { ok: true, userId: session.user.id, scope: 'OWN' };
  if (!auth.ok && asset.purpose === 'TALENT_RESUME') {
    const application = await prisma.jobApplication.findFirst({
      where: { resumeAssetId: asset.id, job: { employerId: session.user.id, hiringProfileId: null } },
      select: { id: true },
    });
    if (application) {
      auth = await authorizeUser(session.user.id, 'talent.application.read', { entityType: 'JobApplication', resourceId: application.id });
    }
  }
  if (!auth.ok && asset.purpose === 'VAULT_DOCUMENT') {
    const document = await prisma.vaultDocument.findUnique({ where: { assetId: asset.id }, select: { id: true, innovationId: true, ownerId: true, active: true } });
    if (document?.active) {
      const approved = document.ownerId === session.user.id || Boolean(await prisma.vaultAccessRequest.findFirst({ where: { innovationId: document.innovationId, requesterId: session.user.id, status: 'APPROVED' }, select: { id: true } }));
      if (approved) auth = await authorizeUser(session.user.id, 'vault.document.read', { entityType: 'VaultDocument', resourceId: document.id });
    }
  }
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (asset.status !== 'CLEAN') return NextResponse.json({ error: 'File is not available' }, { status: 423 });
  const url = await getFileUrl(asset.objectKey, asset.actualContentType || asset.expectedContentType, asset.originalFileName);
  await prisma.uploadAssetAccessLog.create({ data: { assetId: asset.id, actorId: auth.userId, action: 'DOWNLOAD_URL_CREATED' } });
  return NextResponse.redirect(url);
}
