import test from 'node:test';
import assert from 'node:assert/strict';
import type { prisma } from '@/lib/db';
import type { authorizeUser } from '@/lib/authorization';
import { loadHomeFeed } from '@/lib/home-feed';

type Query = { where: Record<string, unknown>; select: Record<string, boolean> };
function fixture(allowed: boolean) {
  const queries: Record<string, Query[]> = {};
  const model = (name: string, rows: unknown[]) => ({ findMany: async (query: Query) => {
    (queries[name] ||= []).push(query);
    if (name === 'debate') throw new Error('Synthetic unavailable section');
    return rows;
  } });
  const db = {
    debate: model('debate', []),
    innovation: model('innovation', [{ id: 'own', title: 'My work', sector: 'Health', tagline: 'Summary', technicalBlueprint: 'PRIVATE' }]),
    marketplaceListing: model('market', [{ id: 'listing', title: 'Listing', description: 'Description', priceDisplay: null, isPaxCertified: true }]),
    job: model('jobs', []),
  } as unknown as typeof prisma;
  const authorize: typeof authorizeUser = async () => allowed
    ? { ok: true, userId: 'test-member', scope: 'OWN' }
    : { ok: false, status: 403, error: 'Forbidden' };
  return { db, authorize, queries };
}

test('Home respects denied permissions before querying protected sections', async () => {
  const dependencies = fixture(false);
  const result = await loadHomeFeed('test-member', dependencies);
  assert.equal(dependencies.queries.debate, undefined);
  assert.equal(dependencies.queries.innovation, undefined);
  assert.equal(result.length, 5);
  assert.equal(result.find(section => section.id === 'innovations')?.items.length, 0);
});

test('Home preserves ownership, excludes expired vendors and isolates section failures', async () => {
  const dependencies = fixture(true);
  const result = await loadHomeFeed('test-member', dependencies);
  assert.deepEqual(dependencies.queries.innovation[0].where, { ownerId: 'test-member', status: { not: 'DRAFT' } });
  assert.equal(dependencies.queries.innovation[0].select.technicalBlueprint, undefined);
  assert.ok(JSON.stringify(dependencies.queries.market[0].where).includes('licenseExpiryDate'));
  assert.ok(result.find(section => section.id === 'debates')?.message);
  assert.equal(result.find(section => section.id === 'market')?.items.length, 1);
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  assert.ok(!JSON.stringify(result).includes('isPaxCertified'));
});
