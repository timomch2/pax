import { prisma } from '@/lib/db';
import { authorizeUser } from '@/lib/authorization';
import type { PracticeSection } from '@/lib/practice-routes';

/** Retain legacy clinical screens until an account has an owned or invited workspace. */
export async function practiceNavigationMode(userId: string, section: PracticeSection) {
  const workspace = process.env.PRACTICE_WORKSPACE_ENABLED === 'true'
    ? await prisma.practiceWorkspace.findFirst({ where: { OR: [{ ownerId: userId }, { members: { some: { userId, revokedAt: null } } }] }, select: { id: true } })
    : null;
  const legacyPermission = !workspace && ({ patients: 'hub.patient.read', calendar: 'hub.appointment.read', finance: 'hub.invoice.read' } as const)[section as 'patients' | 'calendar' | 'finance'];
  if (!legacyPermission) return 'workspace';
  return (await authorizeUser(userId, legacyPermission)).ok ? 'legacy' : 'denied';
}
