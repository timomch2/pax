import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { DataRetentionPolicy } from '@prisma/client';
import { prisma } from '@/lib/db';
import { runTalentRetention } from '@/lib/talent-retention';

const execute = process.argv.includes('--execute');

function cutoff(policy: DataRetentionPolicy) {
  return new Date(Date.now() - policy.retentionDays * 86_400_000);
}

async function applyPolicy(policy: DataRetentionPolicy): Promise<number> {
  const before = cutoff(policy);
  if (policy.action === 'REVIEW') return 0;
  if (policy.dataCategory === 'TALENT_RECRUITMENT') { const result = await runTalentRetention(execute); return result.applications + result.conversations; }
  if (!execute) {
    switch (policy.dataCategory) {
      case 'EXPIRED_AUTH_TOKENS': return prisma.authToken.count({ where: { expiresAt: { lt: before } } });
      case 'EXPIRED_SESSIONS': return prisma.session.count({ where: { expires: { lt: before } } });
      case 'PROCESSED_WEBHOOK_EVENTS': return prisma.webhookEvent.count({ where: { processedAt: { lt: before }, status: { in: ['PROCESSED', 'IGNORED'] } } });
      case 'OPERATIONAL_JOB_RUNS': return prisma.operationalJobRun.count({ where: { finishedAt: { lt: before } } });
      case 'NOTIFICATION_DELIVERY_IDENTIFIERS': return prisma.notificationDelivery.count({ where: { createdAt: { lt: before }, status: { in: ['SENT', 'DELIVERED', 'DEAD_LETTER'] } } });
      default: throw new Error(`Unsupported retention category: ${policy.dataCategory}`);
    }
  }
  switch (policy.dataCategory) {
    case 'EXPIRED_AUTH_TOKENS': return (await prisma.authToken.deleteMany({ where: { expiresAt: { lt: before } } })).count;
    case 'EXPIRED_SESSIONS': return (await prisma.session.deleteMany({ where: { expires: { lt: before } } })).count;
    case 'PROCESSED_WEBHOOK_EVENTS': return (await prisma.webhookEvent.deleteMany({ where: { processedAt: { lt: before }, status: { in: ['PROCESSED', 'IGNORED'] } } })).count;
    case 'OPERATIONAL_JOB_RUNS': return (await prisma.operationalJobRun.deleteMany({ where: { finishedAt: { lt: before } } })).count;
    case 'NOTIFICATION_DELIVERY_IDENTIFIERS': return (await prisma.notificationDelivery.updateMany({
      where: { createdAt: { lt: before }, status: { in: ['SENT', 'DELIVERED', 'DEAD_LETTER'] } },
      data: { recipient: '[retained-redacted]', lastError: null, providerMessageId: null },
    })).count;
    default: throw new Error(`Unsupported retention category: ${policy.dataCategory}`);
  }
}

async function main() {
  const now = new Date();
  const run = await prisma.operationalJobRun.create({
    data: { jobKey: execute ? 'privacy_retention' : 'privacy_retention_dry_run', runKey: `privacy_retention:${now.toISOString()}:${randomUUID()}` },
  });
  let processed = 0;
  let failed = 0;
  try {
    const policies = await prisma.dataRetentionPolicy.findMany({ where: { active: true, approvedAt: { not: null } }, orderBy: { dataCategory: 'asc' } });
    for (const policy of policies) {
      try { processed += await applyPolicy(policy); } catch { failed += 1; }
    }
    await prisma.operationalJobRun.update({ where: { id: run.id }, data: { status: failed ? 'FAILED' : 'SUCCEEDED', processed, failed, finishedAt: new Date(), heartbeatAt: new Date() } });
    if (failed) throw new Error(`${failed} approved retention policies were unsupported or failed`);
  } catch (error) {
    await prisma.operationalJobRun.update({ where: { id: run.id }, data: { status: 'FAILED', processed, failed: Math.max(failed, 1), finishedAt: new Date(), error: error instanceof Error ? error.message.slice(0, 2_000) : 'Retention worker failed' } });
    throw error;
  } finally { await prisma.$disconnect(); }
}

main().catch(() => { process.exitCode = 1; });
