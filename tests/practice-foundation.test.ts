import assert from 'node:assert/strict';
import test from 'node:test';
import { practiceCapabilities, practiceMembershipActive } from '@/lib/practice-policy';
import { normalizeFacilityName, parseRegistryFacility, similarFacilityNames, fetchRegistryPage } from '@/lib/facility-directory';
import { ROLE_PERMISSION_KEYS } from '@/lib/permissions';
import { USER_TYPES } from '@/lib/access';

test('practice roles cannot cross the clinical, financial or owner boundaries', () => {
  const reception = practiceCapabilities(false, true, ['RECEPTION']);
  const finance = practiceCapabilities(false, true, ['FINANCE']);
  assert.ok(reception.includes('calendar.manage'));
  assert.ok(!reception.includes('billing.read'));
  assert.ok(!reception.includes('clinical.read'));
  assert.ok(!reception.includes('calendar.override'));
  assert.ok(finance.includes('billing.manage'));
  assert.ok(!finance.includes('calendar.read'));
  assert.ok(!finance.includes('billing.approve'));
  const combined = practiceCapabilities(false, true, ['RECEPTION', 'FINANCE']);
  assert.ok(combined.includes('calendar.manage') && combined.includes('billing.manage'));
  assert.ok(!combined.includes('clinical.read') && !combined.includes('team.manage'));
  assert.deepEqual(ROLE_PERMISSION_KEYS.STAFF, []);
  assert.ok(!USER_TYPES.some((role) => String(role.value) === 'STAFF'));
});

test('membership lapse keeps owner read/export capabilities but removes all staff access', () => {
  assert.deepEqual(practiceCapabilities(false, false, ['RECEPTION', 'FINANCE']), []);
  assert.ok(practiceCapabilities(true, false, []).includes('report.read'));
  assert.ok(practiceCapabilities(true, false, []).every((action) => action.endsWith('.read')));
  const owner = { accountStatus: 'ACTIVE', role: 'PRACTITIONER', additionalRoles: [], tier: 'TIER2_PROFESSIONAL' as const, hubMember: true };
  assert.equal(practiceMembershipActive(owner), true);
  assert.equal(practiceMembershipActive({ ...owner, hubMember: false }), true, 'Professional membership unlocks the workspace without a separate Hub opt-in');
  assert.equal(practiceMembershipActive({ ...owner, tier: 'TIER1_BASIC' }), false);
  assert.equal(practiceMembershipActive({ ...owner, accountStatus: 'SUSPENDED' }), false);
  assert.equal(practiceMembershipActive({ ...owner, role: 'INVESTOR', additionalRoles: ['PRACTITIONER'] }), true);
});

test('registry normalization preserves separate identifiers and does not invent missing details', () => {
  const parsed = parseRegistryFacility({ officialName: ' Sample Clinic ', fidCode: '123456', frCode: 'FID-X', registrationNumber: '000012', address: { county: ' Nairobi ', subCounty: 'NULL', town: '-' }, facilityType: null });
  assert.equal(parsed?.sourceKey, 'KE_NHFR:fid:123456');
  assert.equal(parsed?.registrationNumber, '000012');
  assert.equal(parsed?.frCode, 'FID-X');
  assert.equal(parsed?.subCounty, null);
  assert.equal(parsed?.town, null);
  assert.equal(parsed?.facilityType, null);
  assert.equal(parseRegistryFacility({ officialName: 'No Identifier' }), null);
  assert.equal(parseRegistryFacility({ officialName: 'NULL', fidCode: '123' }), null);
  assert.equal(normalizeFacilityName('St. Mary’s  Clinic'), 'st mary s clinic');
});

test('facility duplicate suggestions catch spelling and punctuation without conflating distinct names', () => {
  assert.equal(similarFacilityNames('Sunrise Medical Centre', 'SUNRISE MEDICAL CENTER'), true);
  assert.equal(similarFacilityNames('Sunrise Medical Centre', 'Sunrise Medical Cntere'), true);
  assert.equal(similarFacilityNames('Sunrise Medical Centre', 'Westlands Medical Centre'), false);
});

test('registry adapter validates pagination and fails on incomplete/failed pages', async () => {
  const fetcher = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;
  const page = { page: 0, pageSize: 1, totalMatches: 1, data: [{ officialName: 'Example', fidCode: '1' }] };
  assert.equal((await fetchRegistryPage(0, 1, fetcher({ data: { searchFacilities: page } }))).data.length, 1);
  await assert.rejects(fetchRegistryPage(0, 1, fetcher({ data: { searchFacilities: { ...page, page: 1 } } })), /pagination/);
  await assert.rejects(fetchRegistryPage(0, 1, fetcher({ data: { searchFacilities: { ...page, data: [] } } })), /incomplete/);
  await assert.rejects(fetchRegistryPage(0, 1, fetcher({ errors: [{ message: 'unavailable' }] })), /query failed/);
});
