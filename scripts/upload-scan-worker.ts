import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';
import { getMalwareScanStatus } from '@/lib/s3';

async function main() {
  const now = new Date();
  const run = await prisma.operationalJobRun.create({ data: { jobKey: 'upload_guardduty_scan', runKey: `upload_guardduty_scan:${now.toISOString()}:${randomUUID()}` } });
  let processed = 0;
  let failed = 0;
  try {
    const assets = await prisma.uploadAsset.findMany({ where: { status: { in: ['QUARANTINED', 'SCANNING'] }, scanProvider: 'AWS_GUARDDUTY_S3' }, orderBy: { completedAt: 'asc' }, take: 100 });
    for (const asset of assets) {
      try {
        const result = await getMalwareScanStatus(asset.objectKey);
        if (!result) {
          await prisma.uploadAsset.update({ where: { id: asset.id }, data: { status: 'SCANNING', scanResult: 'Awaiting GuardDuty object tag' } });
          continue;
        }
        const clean = result === 'NO_THREATS_FOUND';
        const rejected = result === 'THREATS_FOUND';
        await prisma.$transaction([
          prisma.uploadAsset.update({ where: { id: asset.id }, data: { status: clean ? 'CLEAN' : rejected ? 'REJECTED' : 'QUARANTINED', scannedAt: new Date(), scanResult: result } }),
          prisma.uploadAssetAccessLog.create({ data: { assetId: asset.id, action: 'MALWARE_SCAN_RESULT', outcome: clean ? 'SUCCESS' : 'DENIED' } }),
        ]);
        processed += 1;
      } catch { failed += 1; }
    }
    await prisma.operationalJobRun.update({ where: { id: run.id }, data: { status: failed ? 'FAILED' : 'SUCCEEDED', processed, failed, finishedAt: new Date(), heartbeatAt: new Date() } });
    if (failed) throw new Error(`${failed} upload scan checks failed`);
  } catch (error) {
    await prisma.operationalJobRun.update({ where: { id: run.id }, data: { status: 'FAILED', processed, failed: Math.max(failed, 1), finishedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 2000) : 'Scan worker failed' } });
    throw error;
  } finally { await prisma.$disconnect(); }
}

main().catch(() => { process.exitCode = 1; });
