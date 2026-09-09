import { fetchConfiguredRegistryPage } from '@/lib/facility-registry-transport';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { fetchRegistryPage, parseRegistryFacility, facilityFingerprint } from '@/lib/facility-directory';
import { facilityMatches } from '@/lib/facility-service';
import { practiceTransaction } from '@/lib/practice-db';
import { assertPractice } from '@/lib/practice-policy';

/** One bounded page per invocation. The admin can resume the same run after errors or interruptions. */
export async function importFacilityPage(runId: string, fetchPage = fetchConfiguredRegistryPage) {
  const token = randomUUID();
  const claim = await prisma.facilityImportRun.updateMany({ where: {
    id: runId, status: { in: ['PENDING', 'RUNNING', 'FAILED'] },
    OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
  }, data: { status: 'RUNNING', error: null, leaseToken: token, leaseUntil: new Date(Date.now() + 120000) } });
  assertPractice(claim.count === 1, 409, 'Import is complete or another worker is processing this page');
  const run = await prisma.facilityImportRun.findUniqueOrThrow({ where: { id: runId } });
  try {
    let page: Awaited<ReturnType<typeof fetchRegistryPage>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { page = await fetchPage(run.nextPage, run.pageSize); break; }
      catch (error) { if (attempt === 2) throw error; await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1))); }
    }
    assertPractice(page, 502, 'Registry unavailable');
    const received = page;
    const parsed = received.data.map((row) => parseRegistryFacility(row));
    return await practiceTransaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('facility:KE'))`;
      const current = await tx.facilityImportRun.findUniqueOrThrow({ where: { id: runId } });
      assertPractice(current.leaseToken === token && current.nextPage === run.nextPage, 409, 'Import lease has changed');
      let added = 0, queued = 0, skipped = 0;
      for (const incoming of parsed) {
        if (!incoming) { skipped++; continue; }
        const seenAt = new Date();
        const existing = await tx.healthFacility.findUnique({ where: { sourceKey: incoming.sourceKey } });
        if (existing) {
          if (facilityFingerprint(existing.sourceSnapshot) !== facilityFingerprint(incoming)) {
            const dedupeKey = `${existing.id}:${existing.version}:${facilityFingerprint(incoming)}`;
            const prior = await tx.facilityCorrection.findUnique({ where: { dedupeKey }, select: { id: true } });
            if (!prior) {
              await tx.facilityCorrection.create({ data: { facilityId: existing.id, importRunId: runId, dedupeKey, baseVersion: existing.version, proposed: incoming, reason: 'Registry refresh changed this facility' } });
              queued++;
            }
          } else {
            const redundant = await tx.facilityCorrection.findMany({ where: { facilityId: existing.id, status: 'PENDING', importRunId: { not: null } }, select: { id: true, proposed: true } });
            const ids = redundant.filter((row) => facilityFingerprint(row.proposed) === facilityFingerprint(incoming)).map((row) => row.id);
            if (ids.length) await tx.facilityCorrection.updateMany({ where: { id: { in: ids }, status: 'PENDING' }, data: { status: 'REJECTED', reviewedById: run.requestedById, reviewedAt: seenAt, reviewReason: 'No source change: canonical registry fields match the stored source snapshot.' } });
          }
          await tx.healthFacility.update({ where: { id: existing.id }, data: { sourceSeenAt: seenAt } });
        } else {
          const matches = await facilityMatches(tx, incoming);
          // Separate official identifiers distinguish registry branches. Similar manual records still need review.
          if (matches.duplicate || matches.similar.some((row) => row.source !== 'KE_NHFR')) {
            const match = matches.duplicate;
            const dedupeKey = `import:${incoming.sourceKey}:${match?.version ?? 0}:${facilityFingerprint(incoming)}`;
            const prior = await tx.facilityCorrection.findUnique({ where: { dedupeKey }, select: { id: true } });
            if (!prior) {
              await tx.facilityCorrection.create({ data: { facilityId: match?.id, baseVersion: match?.version, importRunId: runId, dedupeKey, proposed: incoming, reason: 'Registry record may match a facility already added to PAX' } });
              queued++;
            }
          } else {
            await tx.healthFacility.create({ data: { ...incoming, sourceSeenAt: seenAt, sourceSnapshot: incoming as Prisma.InputJsonValue } });
            await tx.facilityCorrection.updateMany({ where: { facilityId: null, status: 'PENDING', importRunId: { not: null }, proposed: { path: ['sourceKey'], equals: incoming.sourceKey } }, data: { status: 'APPROVED', reviewedById: run.requestedById, reviewedAt: seenAt, reviewReason: 'Imported as a distinct official registry identifier; no matching manual facility or duplicate identifier exists.' } });
            added++;
          }
        }
      }
      const complete = (run.nextPage + 1) * run.pageSize >= received.totalMatches;
      return tx.facilityImportRun.update({ where: { id: runId }, data: {
        nextPage: { increment: 1 }, processed: { increment: received.data.length }, added: { increment: added }, queued: { increment: queued }, skipped: { increment: skipped },
        totalMatches: received.totalMatches, status: complete ? 'COMPLETED' : 'RUNNING', finishedAt: complete ? new Date() : null, leaseToken: null, leaseUntil: null,
      } });
    });
  } catch (error) {
    await prisma.facilityImportRun.updateMany({ where: { id: runId, leaseToken: token }, data: { status: 'FAILED', error: 'Registry page could not be imported. Resume to retry the same page.', leaseToken: null, leaseUntil: null } });
    throw error;
  }
}
