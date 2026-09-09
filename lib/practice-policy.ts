import type { MembershipTier, PracticeTeamRole } from '@prisma/client';

export const PRACTICE_ACTIONS = [
  'workspace.read', 'workspace.manage', 'team.manage', 'facility.read', 'facility.manage',
  'patient.read', 'patient.manage', 'clinical.read', 'clinical.manage',
  'calendar.read', 'calendar.manage', 'calendar.override', 'booking.manage',
  'billing.read', 'billing.manage', 'billing.approve', 'report.read',
] as const;
export type PracticeAction = typeof PRACTICE_ACTIONS[number];

const TEAM_ACTIONS: Record<PracticeTeamRole, readonly PracticeAction[]> = {
  RECEPTION: ['workspace.read', 'facility.read', 'patient.read', 'patient.manage', 'calendar.read', 'calendar.manage', 'booking.manage'],
  FINANCE: ['workspace.read', 'facility.read', 'patient.read', 'billing.read', 'billing.manage', 'report.read'],
};

export function practiceMembershipActive(owner: { accountStatus: string; role: string; additionalRoles: string[]; tier: MembershipTier; hubMember: boolean }): boolean {
  return owner.accountStatus === 'ACTIVE' &&
    (owner.role === 'PRACTITIONER' || owner.role === 'ADMIN' || owner.additionalRoles.includes('PRACTITIONER')) &&
    (owner.role === 'ADMIN' || owner.tier !== 'TIER1_BASIC');
}

export function practiceCapabilities(isOwner: boolean, active: boolean, roles: readonly PracticeTeamRole[]): PracticeAction[] {
  if (isOwner) return active ? [...PRACTICE_ACTIONS] : PRACTICE_ACTIONS.filter((action) => action.endsWith('.read'));
  return active ? [...new Set(roles.flatMap((role) => TEAM_ACTIONS[role] ?? []))] : [];
}

export class PracticeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function assertPractice(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new PracticeError(status, message);
}
