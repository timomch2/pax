import type { DataSubjectRequestType, Prisma } from '@prisma/client';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function createDataSubjectRequest(
  tx: Prisma.TransactionClient,
  input: { requesterId: string; type: DataSubjectRequestType; scope?: string | null; reason?: string | null; retentionExceptions?: Prisma.InputJsonValue },
) {
  const now = new Date();
  const request = await tx.dataSubjectRequest.create({
    data: {
      requesterId: input.requesterId,
      type: input.type,
      scope: input.scope || null,
      reason: input.reason || null,
      acknowledgementDueAt: addDays(now, 7),
      resolutionDueAt: addDays(now, 30),
      retentionExceptions: input.retentionExceptions,
    },
  });
  await tx.dataSubjectRequestEvent.create({
    data: { requestId: request.id, toStatus: 'RECEIVED', actorId: input.requesterId },
  });
  return request;
}
