import 'dotenv/config';
import { prisma } from '@/lib/db';
import { existingServiceEvidence, serviceAccountSelect, SERVICE_KEYS } from '@/lib/service-enrollment';

/** Dry-run by default; only creates missing enrollments, never reverses a user's choice. */
async function main() {
  const apply = process.argv.includes('--apply');
  const totals = Object.fromEntries(SERVICE_KEYS.map(key => [key, 0]));
  let cursor: string | undefined;
  do {
    const users = await prisma.user.findMany({ select: serviceAccountSelect, orderBy: { id: 'asc' }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    if (!users.length) break;
    for (const user of users) {
      const evidence = existingServiceEvidence(user);
      for (const serviceKey of SERVICE_KEYS) {
        if (!evidence[serviceKey] || user.services.some(row => row.serviceKey === serviceKey)) continue;
        totals[serviceKey]++;
        if (apply) await prisma.userService.upsert({
          where: { userId_serviceKey: { userId: user.id, serviceKey } },
          update: {},
          create: { userId: user.id, serviceKey, source: 'LEGACY', events: { create: { action: 'BACKFILLED', reason: 'Existing service profile, workspace membership or community participation' } } },
        });
      }
    }
    cursor = users[users.length - 1].id;
  } while (cursor);
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run', candidates: totals }));
}
main().catch(() => { console.error('Service enrollment backfill failed; inspect database connectivity and migration status.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
