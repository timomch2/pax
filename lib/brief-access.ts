import { prisma } from '@/lib/db';
import { isPilotFree } from '@/lib/brief-pricing';

export interface BriefAccess {
  canDownload: boolean;
  purchased: boolean;
  pilotFree: boolean;
  reason: 'admin' | 'initiator' | 'pilot' | 'purchased' | 'locked';
}

// Server-side single source of truth for who may download a full brief.
// Abstract is free to all; this governs the *detailed* brief only.
export async function getBriefAccess(
  userId: string | null,
  debate: { id: string; initiatorId: string },
  isAdmin: boolean,
): Promise<BriefAccess> {
  const pilotFree = isPilotFree();

  if (isAdmin) return { canDownload: true, purchased: false, pilotFree, reason: 'admin' };
  if (userId && userId === debate.initiatorId)
    return { canDownload: true, purchased: false, pilotFree, reason: 'initiator' };

  let purchased = false;
  if (userId) {
    const p = await prisma.briefPurchase.findUnique({
      where: { userId_debateId: { userId, debateId: debate.id } },
      select: { status: true },
    });
    purchased = p?.status === 'PAID';
  }

  if (purchased) return { canDownload: true, purchased: true, pilotFree, reason: 'purchased' };
  if (pilotFree) return { canDownload: true, purchased: false, pilotFree, reason: 'pilot' };
  return { canDownload: false, purchased: false, pilotFree, reason: 'locked' };
}
