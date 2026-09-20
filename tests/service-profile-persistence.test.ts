import test from 'node:test';
import assert from 'node:assert/strict';
import { readServiceProfile, saveServiceProfile, type ServiceProfileDb } from '@/lib/service-profiles';

function fakeDb() {
  const model = () => ({ findUnique: async (_args: any): Promise<any> => null, update: async (_args: any): Promise<any> => null, updateMany: async (_args: any): Promise<any> => ({ count: 0 }) });
  return { user: model(), practitionerProfile: model(), marketplaceVendor: model(), marketplaceBuyer: model() } as unknown as ServiceProfileDb;
}

test('all profile reads scope ownership to the authenticated user', async t => {
  const db = fakeDb();
  const lookups = [
    [db.practitionerProfile, 'practice', { userId: 'actor' }],
    [db.user, 'community', { id: 'actor' }],
    [db.marketplaceVendor, 'vendor', { userId: 'actor' }],
    [db.marketplaceBuyer, 'buyer', { userId: 'actor' }],
  ] as const;
  for (const [model, service, where] of lookups) {
    const lookup = t.mock.method(model, 'findUnique', async (args: any) => { assert.deepEqual(args.where, where); return null; });
    await readServiceProfile('actor', service, db);
    assert.equal(lookup.mock.callCount(), 1);
  }
});

test('community saves do not write clinical profile fields or ownership', async t => {
  const db = fakeDb();
  const clinical = t.mock.method(db.practitionerProfile, 'updateMany', async () => { throw new Error('Unexpected clinical write'); });
  const update = t.mock.method(db.user, 'update', async (args: any) => { assert.deepEqual(args.where, { id: 'actor' }); return args.data; });
  t.mock.method(db.user, 'findUnique', async () => null);
  const values = { headline: 'Researcher', organization: 'Community group', location: 'Nairobi', healthAreas: 'Nutrition', bio: 'Community biography', linkedinUrl: '' };
  await saveServiceProfile('actor', 'community', values, db);
  assert.deepEqual(update.mock.calls[0].arguments[0].data, values);
  assert.equal(clinical.mock.callCount(), 0);
});

test('practice saves use the existing clinical record and preserve shared identity', async t => {
  const db = fakeDb();
  t.mock.method(db.user, 'findUnique', async () => ({ role: 'MEMBER', additionalRoles: ['PRACTITIONER'] }));
  const accountUpdate = t.mock.method(db.user, 'update', async () => { throw new Error('Unexpected account write'); });
  const update = t.mock.method(db.practitionerProfile, 'updateMany', async (args: any) => { assert.deepEqual(args.where, { userId: 'actor' }); return { count: 1 }; });
  t.mock.method(db.practitionerProfile, 'findUnique', async () => null);
  await saveServiceProfile('actor', 'practice', { specialty: 'Medicine', hospital: '', bio: 'Clinical biography', affiliations: '', consultationRate: '1500' }, db);
  assert.equal(update.mock.calls[0].arguments[0].data.consultationRate, 1500);
  assert.equal(accountUpdate.mock.callCount(), 0);
});

test('practice writes reject a non-practitioner before changing records', async t => {
  const db = fakeDb();
  t.mock.method(db.user, 'findUnique', async () => ({ role: 'MEMBER', additionalRoles: [] }));
  const update = t.mock.method(db.practitionerProfile, 'updateMany', async () => { throw new Error('Unexpected write'); });
  await assert.rejects(saveServiceProfile('actor', 'practice', { specialty: 'Medicine', hospital: '', bio: '', affiliations: '', consultationRate: 1500 }, db), /practitioner account/);
  assert.equal(update.mock.callCount(), 0);
});
