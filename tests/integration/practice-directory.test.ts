import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '@/lib/db';
import { authorizePracticeUser } from '@/lib/authorization';
import { addFacility, reviewFacilityCorrection } from '@/lib/facility-service';
import { importFacilityPage } from '@/lib/facility-import';
import { acceptPracticeInvitation, practiceTokenHash } from '@/lib/practice-team';

const database = new URL(process.env.DATABASE_URL || 'postgresql://localhost/undefined');
assert.equal(database.pathname, '/pax_practice_test', 'Integration tests require the dedicated pax_practice_test database');
assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname), 'Integration tests must run locally');
process.env.PRACTICE_WORKSPACE_ENABLED = 'true';

test('workspace access, invitation boundaries, duplicate races and import resumption against PostgreSQL', async () => {
  const suffix = randomUUID();
  const createUser = (label: string, role: 'PRACTITIONER' | 'STAFF' | 'ADMIN' = 'PRACTITIONER') => prisma.user.create({ data: {
    email: `${label}-${suffix}@example.test`, name: label, role, tier: 'TIER2_PROFESSIONAL', hubMember: true, emailVerified: new Date(),
  } });
  try {
    const [owner, stranger, staff, admin] = await Promise.all([createUser('owner'), createUser('stranger'), createUser('staff', 'STAFF'), createUser('admin', 'ADMIN')]);
    const workspace = await prisma.practiceWorkspace.create({ data: { ownerId: owner.id } });
    const otherWorkspace = await prisma.practiceWorkspace.create({ data: { ownerId: stranger.id } });
    const member = await prisma.practiceMember.create({ data: { workspaceId: workspace.id, userId: staff.id, roles: ['RECEPTION'] } });
    assert.equal((await authorizePracticeUser(owner.id, workspace.id, 'clinical.read')).isOwner, true);
    await authorizePracticeUser(staff.id, workspace.id, 'calendar.manage');
    await assert.rejects(authorizePracticeUser(staff.id, workspace.id, 'billing.read'), /access/);
    await assert.rejects(authorizePracticeUser(staff.id, workspace.id, 'clinical.read'), /access/);
    await assert.rejects(authorizePracticeUser(staff.id, otherWorkspace.id, 'calendar.read'), /not found/);
    await assert.rejects(authorizePracticeUser(stranger.id, workspace.id, 'workspace.read'), /not found/);
    await prisma.practiceMember.update({ where: { id: member.id }, data: { roles: ['FINANCE'] } });
    await authorizePracticeUser(staff.id, workspace.id, 'billing.manage');
    await assert.rejects(authorizePracticeUser(staff.id, workspace.id, 'calendar.read'), /access/);
    await prisma.user.update({ where: { id: owner.id }, data: { tier: 'TIER1_BASIC' } });
    await authorizePracticeUser(owner.id, workspace.id, 'report.read');
    await assert.rejects(authorizePracticeUser(owner.id, workspace.id, 'billing.manage'), /membership/);
    await assert.rejects(authorizePracticeUser(staff.id, workspace.id, 'billing.read'), /membership/);
    await prisma.user.update({ where: { id: owner.id }, data: { tier: 'TIER2_PROFESSIONAL' } });
    await prisma.practiceMember.update({ where: { id: member.id }, data: { revokedAt: new Date() } });
    await assert.rejects(authorizePracticeUser(staff.id, workspace.id, 'workspace.read'), /not found/);

    const token = randomBytes(32).toString('hex');
    const invite = await prisma.practiceInvitation.create({ data: { workspaceId: workspace.id, email: staff.email, roles: ['FINANCE'], tokenHash: practiceTokenHash(token), expiresAt: new Date(Date.now() + 60000), invitedById: owner.id } });
    await assert.rejects(acceptPracticeInvitation({ token }, stranger.id), /Sign in/);
    await acceptPracticeInvitation({ token }, staff.id);
    await assert.rejects(acceptPracticeInvitation({ token }, staff.id), /no longer/);
    assert.ok((await prisma.practiceInvitation.findUniqueOrThrow({ where: { id: invite.id } })).acceptedAt);
    await authorizePracticeUser(staff.id, workspace.id, 'billing.read');

    const expiredToken = randomBytes(32).toString('hex');
    await prisma.practiceInvitation.create({ data: { workspaceId: workspace.id, email: staff.email, roles: ['RECEPTION'], tokenHash: practiceTokenHash(expiredToken), expiresAt: new Date(Date.now() - 1000), invitedById: owner.id } });
    await assert.rejects(acceptPracticeInvitation({ token: expiredToken }, staff.id), /expired/);
    await prisma.practiceMember.update({ where: { id: member.id }, data: { roles: ['RECEPTION', 'FINANCE'] } });
    await prisma.practiceMember.create({ data: { workspaceId: otherWorkspace.id, userId: staff.id, roles: ['RECEPTION'] } });
    await authorizePracticeUser(staff.id, workspace.id, 'calendar.manage');
    await authorizePracticeUser(staff.id, workspace.id, 'billing.manage');
    await authorizePracticeUser(staff.id, otherWorkspace.id, 'calendar.manage');
    await assert.rejects(authorizePracticeUser(staff.id, otherWorkspace.id, 'billing.read'), /access/);
    await assert.rejects(authorizePracticeUser(staff.id, workspace.id, 'clinical.read'), /access/);

    const facility = { countryCode: 'KE', officialName: `Directory Test ${suffix}`, county: 'Test County', town: 'Test Town', facilityType: 'Clinic', fidCode: suffix };
    const racing = await Promise.allSettled([addFacility(owner.id, workspace.id, { facility }), addFacility(stranger.id, otherWorkspace.id, { facility })]);
    assert.equal(racing.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(await prisma.healthFacility.count({ where: { fidCode: suffix } }), 1);
    const suggestion = await addFacility(owner.id, workspace.id, { facility: { ...facility, fidCode: null, officialName: `${facility.officialName} Branch` }, disputeReason: 'Separate branch in the same town' });
    assert.equal(suggestion.requiresReview, true);
    assert.ok('correctionId' in suggestion && suggestion.correctionId);
    const correctionId = (suggestion as { correctionId: string }).correctionId;
    await assert.rejects(reviewFacilityCorrection(owner.id, correctionId, { decision: 'APPROVED', reason: 'Test review' }), /administrator/);
    const permission = await prisma.permission.upsert({ where: { key: 'admin.system.manage' }, update: {}, create: { key: 'admin.system.manage', resource: 'admin.system', action: 'manage' } });
    await prisma.userPermission.create({ data: { userId: admin.id, permissionId: permission.id, effect: 'ALLOW', scope: 'ALL' } });
    await reviewFacilityCorrection(admin.id, correctionId, { decision: 'APPROVED', reason: 'Confirmed separate branch', distinctFacility: true });

    const raw = { officialName: `Imported ${suffix}`, fidCode: `IMPORT-${suffix}`, facilityType: 'CLINIC', address: { county: 'IMPORT COUNTY', subCounty: 'NULL', town: 'IMPORT TOWN' } };
    const run = await prisma.facilityImportRun.create({ data: { requestedById: admin.id, pageSize: 1 } });
    const fetcher = async (page: number) => ({ page, pageSize: 1, totalMatches: 2, data: [{ ...raw, fidCode: `${raw.fidCode}-${page}`, officialName: `${raw.officialName} ${page}` }] });
    const first = await importFacilityPage(run.id, fetcher);
    assert.equal(first.nextPage, 1);
    await assert.rejects(importFacilityPage(run.id, async () => { throw new Error('Simulated offline source'); }));
    assert.equal((await prisma.facilityImportRun.findUniqueOrThrow({ where: { id: run.id } })).nextPage, 1);
    const resumed = await importFacilityPage(run.id, fetcher);
    assert.equal(resumed.status, 'COMPLETED');
    assert.equal(resumed.added, 2, 'Distinct official identifiers import without branch-by-branch review');
    const replay = await prisma.facilityImportRun.create({ data: { requestedById: admin.id, pageSize: 1 } });
    const unchanged = await importFacilityPage(replay.id, fetcher);
    assert.equal(unchanged.added, 0); assert.equal(unchanged.queued, 0, 'JSONB key ordering must not create refresh changes');
    const refresh = await prisma.facilityImportRun.create({ data: { requestedById: admin.id, pageSize: 1 } });
    await importFacilityPage(refresh.id, async () => ({ page: 0, pageSize: 1, totalMatches: 1, data: [{ ...raw, fidCode: `${raw.fidCode}-0`, officialName: 'Changed Official Name' }] }));
    const imported = await prisma.healthFacility.findUniqueOrThrow({ where: { sourceKey: `KE_NHFR:fid:${raw.fidCode}-0` } });
    assert.equal(imported.officialName, `${raw.officialName} 0`);
    const refreshCorrection = await prisma.facilityCorrection.findFirstOrThrow({ where: { facilityId: imported.id, status: 'PENDING' } });
    await reviewFacilityCorrection(admin.id, refreshCorrection.id, { decision: 'APPROVED', reason: 'Registry change reviewed' });
    assert.equal((await prisma.healthFacility.findUniqueOrThrow({ where: { id: imported.id } })).officialName, 'Changed Official Name');
  } finally { await prisma.$disconnect(); }
});
