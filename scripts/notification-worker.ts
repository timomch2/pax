import 'dotenv/config';
import { prisma } from '../lib/db';
import { processNotificationBatch } from '../lib/notification-worker';

async function main() {
  const result = await processNotificationBatch(100);
  console.log(`Notification worker processed ${result.processed} event(s).`);
}

main()
  .catch((error) => {
    console.error('Notification worker failed', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

