import 'dotenv/config';
import { prisma } from '../lib/db';
import { queuePracticeReminders } from '../lib/practice-delivery';
import { processNotificationBatch } from '../lib/notification-worker';
import { queueTalentAlerts } from '../lib/talent-alerts';

async function main() {
  if (process.env.TALENT_ENABLED === 'true') {
    try { await queueTalentAlerts(); } catch { console.error('Talent job alert scan failed; queued notifications will still be processed.'); process.exitCode = 1; }
  }
  if (process.env.PRACTICE_WORKSPACE_ENABLED === 'true') {
    try {
      let cursor: string | undefined;
      do { const batch = await queuePracticeReminders(cursor); cursor = batch.nextCursor ?? undefined; } while (cursor);
    } catch {
      // A practice configuration failure must not prevent unrelated queued notifications from delivery.
      console.error('Practice reminder scan failed; check practice configuration and retry the scan.');
      process.exitCode = 1;
    }
  }
  const result = await processNotificationBatch(100);
  console.log(`Notification worker processed ${result.processed} event(s).`);
}

main()
  .catch((error) => {
    console.error('Notification worker failed', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
