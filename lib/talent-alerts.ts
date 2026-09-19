import { prisma } from "@/lib/db";
import { talentTransaction } from "@/lib/talent-access";
import { jobFilter } from "@/lib/talent-jobs";
import { searchSchema } from "@/lib/talent-validation";
import { notifyTalent } from "@/lib/talent-notifications";
import { talentEnabled } from "@/lib/product-hosts";

export async function queueTalentAlerts(now = new Date()) {
  if (!talentEnabled()) return 0;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 8) return 0;
  let queued = 0,
    cursor: string | undefined;
  do {
    const searches = await prisma.talentSavedSearch.findMany({
      where: { alertsEnabled: true, user: { accountStatus: "ACTIVE" } },
      take: 100,
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const search of searches)
      await talentTransaction(async (db) => {
        const current = await db.talentSavedSearch.findUnique({
          where: { id: search.id },
        });
        if (!current?.alertsEnabled) return;
        const lastDay = current.lastAlertAt
          ? new Intl.DateTimeFormat("en-CA", {
              timeZone: "Africa/Nairobi",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(current.lastAlertAt)
          : null;
        if (lastDay === day) return;
        const filters = searchSchema.parse(current.filters);
        const since = current.lastAlertAt || current.createdAt;
        const count = await db.job.count({
          where: {
            AND: [jobFilter(filters), { publishedAt: { gt: since, lte: now } }],
          },
        });
        if (count) {
          await notifyTalent(db, {
            userId: current.userId,
            summary: `${count} new jobs match your saved search.`,
            path: "/talent/saved",
            type: "search",
            resourceId: current.id,
            key: `digest:${current.id}:${day}`,
          });
          queued++;
        }
        await db.talentSavedSearch.update({
          where: { id: current.id },
          data: { lastAlertAt: now },
        });
      });
    cursor = searches.length === 100 ? searches.at(-1)!.id : undefined;
  } while (cursor);
  return queued;
}
