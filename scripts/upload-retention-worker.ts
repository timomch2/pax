import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { deleteFile } from '@/lib/s3';
import { talentAssetReferenced } from '@/lib/talent-retention';

async function main() {
  const now = new Date();
  const run = await prisma.operationalJobRun.create({ data: { jobKey: 'upload_retention', runKey: `upload_retention:${now.toISOString()}:${randomUUID()}` } });
  let processed = 0;
  let failed = 0;
  try {
    const assets = await prisma.uploadAsset.findMany({ where: { retainedUntil: { lt: now }, status: { in: ['PENDING_UPLOAD', 'REJECTED'] } }, take: 100, orderBy: { retainedUntil: 'asc' } });
    for (const asset of assets) {
      try {
        if (['TALENT_RESUME', 'TALENT_DOCUMENT'].includes(asset.purpose) && await talentAssetReferenced(asset.id)) continue;
        await deleteFile(asset.objectKey);
        await prisma.uploadAsset.update({ where: { id: asset.id }, data: { status: 'EXPIRED', scanResult: 'Retention window elapsed' } });
        processed += 1;
      } catch { failed += 1; }
    }
    await prisma.operationalJobRun.update({ where: { id: run.id }, data: { status: failed ? 'FAILED' : 'SUCCEEDED', processed, failed, finishedAt: new Date(), heartbeatAt: new Date() } });
    if (failed) throw new Error(`${failed} asset retention actions failed`);
  } catch (error) {
    await prisma.operationalJobRun.update({ where: { id: run.id }, data: { status: 'FAILED', processed, failed: Math.max(failed, 1), finishedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 2000) : 'Retention worker failed' } });
    throw error;
  } finally { await prisma.$disconnect(); }
}

main().catch(() => { process.exitCode = 1; });
