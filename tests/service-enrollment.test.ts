import test from 'node:test';
import assert from 'node:assert/strict';
import { existingServiceEvidence, isServiceKey, serviceAccountSummary, type ServiceAccount } from '@/lib/service-enrollment';

function account(overrides: Partial<ServiceAccount> = {}): ServiceAccount {
  return { id: 'member', accountStatus: 'ACTIVE', role: 'PRACTITIONER', additionalRoles: [], tier: 'TIER2_PROFESSIONAL', hubMember: true,
    emailVerified: new Date('2026-01-01'), services: [], practitionerProfile: null, practiceWorkspace: null, practiceMemberships: [],
    talentProfile: null, talentHiringProfiles: [], talentMemberships: [], marketplaceVendor: null, marketplaceBuyer: null,
    _count: { debatesInitiated: 0, debateContributions: 0, debateStances: 0 }, ...overrides };
}
const availability = { practice: true, talent: true };
test('backfill requires service evidence, never a global role or tier', () => {
  assert.deepEqual(existingServiceEvidence(account()), { practice: false, talent: false, market: false, community: false });
  assert.deepEqual(existingServiceEvidence(account({ practitionerProfile: { id: 'profile' }, marketplaceVendor: { id: 'vendor', status: 'PENDING', licenseExpiryDate: null }, talentProfile: { userId: 'member' }, _count: { debatesInitiated: 0, debateContributions: 1, debateStances: 0 } })), { practice: true, talent: true, market: true, community: true });
  assert.equal(isServiceKey('home'), false);
  assert.equal(isServiceKey('__proto__'), false);
});
test('enrollment and access are independent; enabling does not complete setup', () => {
  const now = new Date('2026-01-01');
  const services = [{ id: 'enrollment', userId: 'member', serviceKey: 'talent' as const, state: 'ENABLED' as const, source: 'SELF' as const, enabledAt: now, disabledAt: null, createdAt: now, updatedAt: now }];
  const summary = serviceAccountSummary(account({ services }), availability);
  assert.equal(summary.find(s => s.id === 'talent')?.state, 'ENABLED');
  assert.equal(summary.find(s => s.id === 'talent')?.access, 'SETUP_REQUIRED');
  assert.ok(summary.every(s => s.accessSource === 'EXISTING_RULES'));
  assert.equal(summary.find(s => s.id === 'community')?.state, 'NOT_ENABLED');
});
test('practice membership expiry retains owner read-only summary; team access follows its owner', () => {
  const owner = account({ tier: 'TIER1_BASIC', practiceWorkspace: { id: 'workspace' } });
  assert.equal(serviceAccountSummary(owner, availability)[0].access, 'LIMITED');
  const staff = account({ role: 'STAFF', tier: 'TIER1_BASIC', practiceMemberships: [{ roles: ['RECEPTION'], workspace: { owner: account() } }] });
  assert.equal(serviceAccountSummary(staff, availability)[0].access, 'ACTIVE');
  staff.practiceMemberships[0].workspace.owner.accountStatus = 'SUSPENDED';
  assert.notEqual(serviceAccountSummary(staff, availability)[0].access, 'ACTIVE');
});
test('feature availability and account restrictions override workspace readiness', () => {
  const ready = account({ practiceWorkspace: { id: 'workspace' }, talentProfile: { userId: 'member' } });
  assert.equal(serviceAccountSummary(ready, { practice: false, talent: false })[0].access, 'UNAVAILABLE');
  assert.ok(serviceAccountSummary({ ...ready, accountStatus: 'SUSPENDED' }, availability).every(s => s.access === 'ACCOUNT_RESTRICTED'));
  assert.equal(serviceAccountSummary({ ...ready, emailVerified: null }, availability).find(s => s.id === 'talent')?.access, 'SETUP_REQUIRED');
});

test('vendor approval and expired licences are separate from service enrollment', () => {
  const now = new Date('2026-09-20');
  const vendor = { id: 'vendor', status: 'APPROVED' as const, licenseExpiryDate: new Date('2026-09-19') };
  const summary = serviceAccountSummary(account({ marketplaceVendor: vendor }), availability, now);
  assert.equal(summary.find(s => s.id === 'market')?.access, 'LIMITED');
  assert.equal(serviceAccountSummary(account({ marketplaceVendor: { ...vendor, licenseExpiryDate: new Date('2027-01-01') } }), availability, now).find(s => s.id === 'market')?.access, 'ACTIVE');
});

test('disabled enrollment stays disabled even when an existing workspace is active', () => {
  const now = new Date('2026-01-01');
  const user = account({ practiceWorkspace: { id: 'workspace' }, services: [{ id: 'e', userId: 'member', serviceKey: 'practice', state: 'DISABLED', source: 'LEGACY', enabledAt: now, disabledAt: now, createdAt: now, updatedAt: now }] });
  const practice = serviceAccountSummary(user, availability).find(s => s.id === 'practice')!;
  assert.equal(practice.state, 'DISABLED');
  assert.equal(practice.access, 'ACTIVE');
  assert.equal(practice.source, 'LEGACY');
});
