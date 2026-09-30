import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/** Retry only serialization/deadlock conflicts; all external I/O belongs outside this transaction. */
export async function practiceTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable', timeout: 5000 });
    } catch (error) {
      if (attempt < 5 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        // Yield outside the rolled-back transaction so concurrent writers do not retry in lockstep.
        await new Promise((resolve) => setTimeout(resolve, 30 * 2 ** attempt + Math.floor(Math.random() * 40)));
        continue;
      }
      throw error;
    }
  }
}

/** Serialize sensitive changes in one workspace without locking any other practitioner. */
export async function lockPractice(tx: Prisma.TransactionClient, workspaceId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM practice."PracticeWorkspace" WHERE id = ${workspaceId} FOR UPDATE`;
}
