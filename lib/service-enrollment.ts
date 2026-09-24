import { Prisma, ServiceKey } from '@prisma/client';
import { prisma } from '@/lib/db';
import { hasRole } from '@/lib/access';
import { serviceLinks } from '@/lib/service-navigation';
import { productUrl, talentEnabled } from '@/lib/product-hosts';
import { practiceMembershipActive } from '@/lib/practice-policy';

export const SERVICE_KEYS = ['practice', 'talent', 'market', 'community', 'innovation', 'investment', 'safety'] as const;
export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === 'string' && SERVICE_KEYS.includes(value as ServiceKey);
}

const ownerSelect = { accountStatus: true, role: true, additionalRoles: true, tier: true, hubMember: true } as const;
export const serviceAccountSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true, ...ownerSelect, emailVerified: true,
  services: true,
  practitionerProfile: { select: { id: true } },
  practiceWorkspace: { select: { id: true } },
  practiceMemberships: { where: { revokedAt: null }, select: { roles: true, workspace: { select: { owner: { select: ownerSelect } } } } },
  talentProfile: { select: { userId: true } },
  talentHiringProfiles: { select: { id: true } },
  talentMemberships: { where: { revokedAt: null }, select: { hiringProfile: { select: { owner: { select: { accountStatus: true } } } } } },
  marketplaceVendor: { select: { id: true, status: true, licenseExpiryDate: true } },
  marketplaceBuyer: { select: { id: true, status: true } },
  investorMandate: { select: { id: true } },
  _count: { select: { innovations: true, investments: true, vaultAccessRequests: true, debatesInitiated: true, debateContributions: true, debateStances: true } },
});
export type ServiceAccount = Prisma.UserGetPayload<{ select: typeof serviceAccountSelect }>;

/** Only actual service records qualify for migration; roles and public visits do not. */
export function existingServiceEvidence(user: ServiceAccount): Record<ServiceKey, boolean> {
  return {
    practice: Boolean(user.practitionerProfile || user.practiceWorkspace || user.practiceMemberships.length),
    talent: Boolean(user.talentProfile || user.talentHiringProfiles.length || user.talentMemberships.length),
    market: Boolean(user.marketplaceVendor || user.marketplaceBuyer),
    innovation: user._count.innovations > 0,
    investment: Boolean(user.investorMandate || user._count.investments || user._count.vaultAccessRequests),
    safety: false, // Never infer a preference from confidential reporting history.
    community: Boolean(user._count.debatesInitiated || user._count.debateContributions || user._count.debateStances),
  };
}

/** This is a workspace summary, not a replacement for resource-level authorization. */
export function serviceAccountSummary(user: ServiceAccount, availability = { practice: process.env.PRACTICE_WORKSPACE_ENABLED === 'true', talent: talentEnabled() }, now = new Date()) {
  const evidence = existingServiceEvidence(user);
  return serviceLinks().filter(link => link.id !== 'home').map(link => {
    const key = link.id as ServiceKey;
    const enrollment = user.services.find(row => row.serviceKey === key);
    let access: 'ACTIVE' | 'SETUP_REQUIRED' | 'LIMITED' | 'UNAVAILABLE' | 'ACCOUNT_RESTRICTED' = 'ACTIVE';
    let canOpen = true;
    let dashboardHref: string | null = null;
    let reason = 'Current permissions and verification rules apply.';
    if (key === 'practice') {
      const teamActive = user.practiceMemberships.some(member => member.roles.length && practiceMembershipActive(member.workspace.owner));
      if (!availability.practice) { access = 'UNAVAILABLE'; reason = 'The practitioner workspace is not currently available.'; }
      else if (!user.practiceWorkspace && !teamActive) { access = 'SETUP_REQUIRED'; reason = 'Open Medical Practitioner to check eligibility and set up a workspace, or accept a team invitation.'; }
      else if (!teamActive && !practiceMembershipActive(user)) { access = 'LIMITED'; reason = 'Your existing workspace has read-only access under the current membership rules.'; }
    }
    if (key === 'talent') {
      const teamActive = user.talentMemberships.some(member => member.hiringProfile.owner.accountStatus === 'ACTIVE');
      if (!availability.talent) { access = 'UNAVAILABLE'; reason = 'Talent Marketplace is not currently available.'; }
      else if (!user.emailVerified) { access = 'SETUP_REQUIRED'; reason = 'Verify your email before using Talent workspace features.'; }
      else if (!user.talentProfile && !user.talentHiringProfiles.length && !teamActive) { access = 'SETUP_REQUIRED'; reason = 'Create your candidate or hiring profile, or accept a team invitation.'; }
    }
    if (key === 'market') {
      if (!evidence.market) { access = 'SETUP_REQUIRED'; reason = 'Browse Product Marketplace or register a buyer or vendor profile to use its workspace.'; }
      else if ((user.marketplaceVendor && (user.marketplaceVendor.status !== 'APPROVED' || (user.marketplaceVendor.licenseExpiryDate && user.marketplaceVendor.licenseExpiryDate < now))) || (user.marketplaceBuyer && user.marketplaceBuyer.status !== 'VERIFIED')) {
        access = 'LIMITED'; reason = 'Some marketplace features require buyer verification or a current approved vendor licence. Browse Product Marketplace or open your service profile for details.';
      } else { reason = 'Buyer and vendor approval and licence rules apply independently. Purchases take place with vendors.'; }
    }
    if (key === 'innovation' || key === 'investment') {
      const requiredRole = key === 'innovation' ? 'INNOVATOR' : 'INVESTOR';
      if (!hasRole(user.role, user.additionalRoles, requiredRole)) {
        access = 'LIMITED'; canOpen = false;
        reason = `An ${key === 'innovation' ? 'innovator' : 'investor'} role is required to open this workspace. Enabling this service does not grant that role. Contact support if you need access.`;
      }
    }
    if (key === 'safety') {
      reason = 'Report a drug side effect or product concern. Reports and signals are restricted to authorized administrators and policymakers.';
      // Match the existing safety APIs, which accept these primary roles only.
      if (user.role === 'ADMIN') dashboardHref = productUrl('main', '/admin/safety');
      else if (user.role === 'POLICYMAKER') dashboardHref = productUrl('main', '/policymaker/safety');
    }
    if (user.accountStatus !== 'ACTIVE') { access = 'ACCOUNT_RESTRICTED'; reason = 'Your account is restricted. Contact support for assistance.'; }
    if (access === 'UNAVAILABLE' || access === 'ACCOUNT_RESTRICTED') { canOpen = false; dashboardHref = null; }
    return {
      ...link, id: key, state: enrollment?.state ?? 'NOT_ENABLED', source: enrollment?.source ?? null,
      enabledAt: enrollment?.enabledAt.toISOString() ?? null, disabledAt: enrollment?.disabledAt?.toISOString() ?? null,
      access, reason, canOpen, dashboardHref, setupComplete: canOpen && (access === 'ACTIVE' || access === 'LIMITED'),
      accessSource: 'EXISTING_RULES' as const,
      manageHref: productUrl('accounts', `/account?service=${key}#my-services`),
    };
  });
}
export type ServiceSummary = ReturnType<typeof serviceAccountSummary>[number];

export class ServiceEnrollmentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function readAccountServices(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: serviceAccountSelect });
  if (!user) throw new ServiceEnrollmentError(404, 'Account not found');
  return serviceAccountSummary(user);
}

/** Commit choice and audit together; retry concurrent enables without duplicate history. */
export async function setServiceEnrollment(userId: string, serviceKey: ServiceKey, enabled: boolean) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { accountStatus: true } });
        if (!user || user.accountStatus !== 'ACTIVE') throw new ServiceEnrollmentError(403, 'An active account is required');
        const current = await tx.userService.findUnique({ where: { userId_serviceKey: { userId, serviceKey } } });
        const state = enabled ? 'ENABLED' : 'DISABLED';
        if (current?.state === state || (!current && !enabled)) return;
        const now = new Date();
        const row = await tx.userService.upsert({
          where: { userId_serviceKey: { userId, serviceKey } },
          create: { userId, serviceKey, state, source: 'SELF', enabledAt: now },
          update: { state, ...(enabled ? { enabledAt: now, disabledAt: null } : { disabledAt: now }) },
        });
        await tx.userServiceEvent.create({ data: { userServiceId: row.id, actorId: userId, action: state, reason: 'Account owner changed service enrollment' } });
      }, { isolationLevel: 'Serializable' });
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code) && attempt < 2) continue;
      throw error;
    }
  }
}
