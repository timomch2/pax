// Server-only credibility recomputation. Pulls a member's documented GPS
// evidence AND their live debate contributions, computes the unified
// Credibility Score (lib/gps.ts) and persists it on the User record.
//
// This is the single source of truth for writing User.credibilityScore — call
// it whenever the inputs change (GPS entry / endorsement / debate contribution
// / upvote).

import { prisma } from '@/lib/db';
import { computeCredibilityScore } from '@/lib/gps';

export async function recomputeCredibility(userId: string): Promise<number> {
  const [entries, contributions] = await Promise.all([
    prisma.gpsEntry.findMany({
      where: { userId },
      include: { endorsements: { select: { endorserType: true } } },
    }),
    prisma.debateContribution.findMany({
      where: { authorId: userId, moderationStatus: { not: 'REMOVED' } },
      select: { kind: true, _count: { select: { upvotes: true } } },
    }),
  ]);

  const upvotesReceived = contributions.reduce(
    (sum, c) => sum + (c._count?.upvotes ?? 0),
    0,
  );
  const expertOpinions = contributions.filter((c) => c.kind === 'EXPERT_OPINION').length;

  const score = computeCredibilityScore(entries as any, {
    contributions: contributions.length,
    upvotesReceived,
    expertOpinions,
  });

  await prisma.user.update({ where: { id: userId }, data: { credibilityScore: score } });
  return score;
}
