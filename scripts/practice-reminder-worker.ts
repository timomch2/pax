import 'dotenv/config';
import { prisma } from '../lib/db';
import { queuePracticeReminders } from '../lib/practice-delivery';
async function main() {
  let cursor: string | undefined, scanned = 0;
  do {
    const result = await queuePracticeReminders(cursor);
    scanned += result.queued; cursor = result.nextCursor ?? undefined;
  } while (cursor);
  console.log(`Practice reminder scan processed ${scanned} eligible reminders; delivery uses the existing outbox worker.`);
}
main().catch(() => { console.error('Practice reminder scan failed; inspect the worker and delivery monitor.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
