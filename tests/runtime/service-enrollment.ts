import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import { chromium, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { setServiceEnrollment } from '@/lib/service-enrollment';

// Deliberately limited to synthetic fixtures in the local development database.
const database = new URL(process.env.DATABASE_URL!);
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname));
assert.equal(database.pathname, '/pax_dev');
assert.notEqual(process.env.PAX_PRODUCT_ROUTING_ENABLED, 'true');
const base = 'http://localhost:3000';
async function main() {
  const suffix = randomUUID();
  const ids: string[] = [];
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const owner = await prisma.user.create({ data: { name: 'Service Test Member', email: `service-${suffix}@example.test`, role: 'MEMBER', emailVerified: new Date() } }); ids.push(owner.id);
    const stranger = await prisma.user.create({ data: { name: 'Service Test Stranger', email: `stranger-${suffix}@example.test`, role: 'MEMBER', emailVerified: new Date() } }); ids.push(stranger.id);
    const admin = await prisma.user.create({ data: { name: 'Service Test Admin', email: `admin-${suffix}@example.test`, role: 'ADMIN', emailVerified: new Date() } }); ids.push(admin.id);
    const permission = await prisma.permission.findUniqueOrThrow({ where: { key: 'admin.user.read' } });
    await prisma.userPermission.create({ data: { userId: admin.id, permissionId: permission.id, effect: 'ALLOW', scope: 'ALL' } });
    const policymaker = await prisma.user.create({ data: { name: 'Service Test Policymaker', email: `policy-${suffix}@example.test`, role: 'POLICYMAKER', emailVerified: new Date() } }); ids.push(policymaker.id);
    const context = await browser.newContext();
    const cookie = async (user: typeof owner) => ({ name: 'next-auth.session-token', value: await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { role: user.role, sub: user.id, id: user.id, email: user.email, name: user.name, sessionVersion: user.sessionVersion, sessionStartedAt: Math.floor(Date.now() / 1000) } }), domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' as const });
    await context.addCookies([await cookie(owner)]);
    assert.equal((await browser.newContext().then(c => c.request.get(`${base}/api/account/services`))).status(), 401);
    const guestContext = await browser.newContext();
    assert.equal((await guestContext.request.get(`${base}/safety`)).status(), 200);
    for (const endpoint of ['drug-report', 'product-feedback']) assert.equal((await guestContext.request.get(`${base}/api/safety/${endpoint}`)).status(), 401);
    const guestPapers = await guestContext.request.get(`${base}/knowledge/papers`, { maxRedirects: 0 });
    assert.equal(guestPapers.status(), 307);
    assert.ok(guestPapers.headers().location.endsWith('/login'));
    const request = context.request;
    const catalog = await request.get(`${base}/api/products`).then(r => r.json());
    assert.equal(catalog.services.length, 8); // Seven services plus Home.
    assert.equal(catalog.services.find((s: { id: string }) => s.id === 'safety').href, '/safety');
    for (const endpoint of ['drug-report', 'product-feedback']) {
      assert.equal((await request.get(`${base}/api/safety/${endpoint}`)).status(), 403);
    }
    assert.equal((await request.get(`${base}/safety`)).status(), 200);
    for (const serviceKey of ['innovation', 'investment', 'safety']) {
      const response = await request.patch(`${base}/api/account/services`, { headers: { Origin: base }, data: { serviceKey, enabled: true } });
      assert.equal(response.status(), 200);
    }
    const summaries = await request.get(`${base}/api/account/services`).then(r => r.json());
    assert.equal(summaries.services.length, 7);
    for (const id of ['innovation', 'investment']) {
      const service = summaries.services.find((s: { id: string }) => s.id === id);
      assert.equal(service.canOpen, false);
      assert.equal(service.state, 'ENABLED');
    }
    assert.equal(summaries.services.find((s: { id: string }) => s.id === 'safety').dashboardHref, null);
    assert.equal((await request.get(`${base}/api/admin/users`)).status(), 403);
    assert.equal((await request.patch(`${base}/api/account/services`, { headers: { Origin: 'https://foreign.example' }, data: { serviceKey: 'talent', enabled: true } })).status(), 403);
    assert.equal((await request.patch(`${base}/api/account/services`, { headers: { Origin: base }, data: { serviceKey: 'talent', enabled: true, userId: stranger.id } })).status(), 400);
    const runtimeErrors: string[] = [];
    let page = await context.newPage();
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.goto(`${base}/account?service=talent`);
    const card = page.locator('#my-services .rounded-lg').filter({ has: page.getByRole('heading', { name: 'Talent Marketplace', exact: true }) });
    await card.getByRole('button', { name: 'Enable service', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Disable service', exact: true })).toBeVisible();
    await page.reload();
    await expect(card.getByRole('button', { name: 'Disable service', exact: true })).toBeVisible();
    await card.getByRole('button', { name: 'Disable service', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Enable service', exact: true })).toBeVisible();
    await Promise.all([setServiceEnrollment(owner.id, 'community', true), setServiceEnrollment(owner.id, 'community', true)]);
    assert.equal(await prisma.userServiceEvent.count({ where: { userService: { userId: owner.id, serviceKey: 'community' } } }), 1);
    assert.equal(await prisma.userService.count({ where: { userId: stranger.id } }), 0);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).role, 'MEMBER');
    assert.equal(await prisma.entitlement.count({ where: { userId: owner.id } }), 0);
    const exported = await request.get(`${base}/api/privacy/export`);
    assert.equal(exported.status(), 200);
    const exportedAccount = (await exported.json()).account;
    assert.equal(exportedAccount.services.length, 5);
    assert.ok(exportedAccount.services.every((service: { userId: string; events: unknown[] }) => service.userId === owner.id && service.events.length > 0));
    assert.equal(exportedAccount.password, undefined);
    await page.goto(base);
    await expect(page.getByRole('link', { name: 'GPS — shared evidence', exact: true })).toHaveAttribute('href', '/modules/gps-profiles');
    await page.getByRole('button', { name: 'PAX apps', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Talent Marketplace Enable service', exact: true })).toHaveAttribute('href', '/account?service=talent#my-services');
    await expect(page.getByRole('navigation', { name: 'PAX services', exact: true }).getByRole('link', { name: 'Knowledge Exchange', exact: true })).toHaveAttribute('href', '/community');
    const servicesNav = page.getByRole('navigation', { name: 'PAX services', exact: true });
    await expect(servicesNav.getByRole('link')).toHaveCount(8);
    for (const [label, key] of [['Innovation Hub', 'innovation'], ['Investment Platform', 'investment']]) {
      await expect(servicesNav.getByRole('link', { name: `${label} Access details`, exact: true })).toHaveAttribute('href', `/account?service=${key}#my-services`);
    }
    await expect(servicesNav.getByRole('link', { name: 'Pharmacovigilance', exact: true })).toHaveAttribute('href', '/safety');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'PAX apps', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(servicesNav).toBeVisible();
    await page.screenshot({ path: '/tmp/pax-seven-launcher-desktop.png', animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: '/tmp/pax-seven-launcher-mobile.png' });
    await page.keyboard.press('Escape');
    await page.goto(`${base}/knowledge/papers`);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Unpublished Papers', exact: true })).toBeVisible();
    await expect(page.getByText('Coming soon', { exact: true })).toBeVisible();
    assert.equal(await page.locator('input[type=file]').count(), 0);
    await page.screenshot({ path: '/tmp/pax-seven-papers-mobile.png', fullPage: true });
    await page.goto(`${base}/account`);
    for (const label of ['Innovation Hub', 'Investment Platform']) {
      const serviceCard = page.locator('#my-services .rounded-lg').filter({ has: page.getByRole('heading', { name: label, exact: true }) });
      assert.equal(await serviceCard.getByRole('link', { name: 'Open service', exact: true }).count(), 0);
      assert.equal(await serviceCard.getByRole('link', { name: 'Service profile', exact: true }).count(), 0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: '/tmp/pax-service-account-mobile.png', fullPage: true });
    const adminContext = await browser.newContext();
    await adminContext.addCookies([await cookie(admin)]);
    const adminRequest = adminContext.request;
    page = await adminContext.newPage();
    const list = await adminRequest.get(`${base}/api/admin/users?q=${suffix}&service=talent&serviceState=DISABLED`);
    assert.equal(list.status(), 200);
    assert.deepEqual((await list.json()).users.map((u: { id: string }) => u.id), [owner.id]);
    const filtered = await adminRequest.get(`${base}/api/admin/users?q=${suffix}&service=talent&serviceState=DISABLED&serviceAccess=SETUP_REQUIRED`);
    assert.equal(filtered.status(), 200);
    assert.deepEqual((await filtered.json()).users.map((u: { id: string }) => u.id), [owner.id]);
    const active = await adminRequest.get(`${base}/api/admin/users?q=${suffix}&service=talent&serviceAccess=ACTIVE`);
    assert.equal((await active.json()).users.length, 0);
    assert.equal((await adminRequest.get(`${base}/api/admin/users?serviceAccess=ACTIVE`)).status(), 400);
    const innovationFilter = await adminRequest.get(`${base}/api/admin/users?q=${suffix}&service=innovation&serviceState=ENABLED&serviceAccess=LIMITED`);
    assert.equal(innovationFilter.status(), 200);
    assert.deepEqual((await innovationFilter.json()).users.map((u: { id: string }) => u.id), [owner.id]);
    assert.equal((await adminRequest.get(`${base}/api/account/services`).then(r => r.json())).services.find((s: { id: string }) => s.id === 'safety').dashboardHref, '/admin/safety');
    const policyContext = await browser.newContext();
    await policyContext.addCookies([await cookie(policymaker)]);
    assert.equal((await policyContext.request.get(`${base}/api/account/services`).then(r => r.json())).services.find((s: { id: string }) => s.id === 'safety').dashboardHref, '/policymaker/safety');
    for (const endpoint of ['drug-report', 'product-feedback']) {
      assert.equal((await adminRequest.get(`${base}/api/safety/${endpoint}`)).status(), 200);
      assert.equal((await policyContext.request.get(`${base}/api/safety/${endpoint}`)).status(), 200);
    }
    await page.goto(`${base}/admin/users`);
    await page.getByPlaceholder('Search name, email or organisation').fill(suffix);
    await expect(page.getByText('Service Test Member', { exact: true })).toBeVisible();
    await page.getByText('Services (4 enabled)', { exact: true }).click();
    await expect(page.getByText('Talent Marketplace · Disabled', { exact: true })).toBeVisible();
    await prisma.user.update({ where: { id: owner.id }, data: { accountStatus: 'SUSPENDED' } });
    await assert.rejects(setServiceEnrollment(owner.id, 'market', true), /active account/);
    assert.deepEqual(runtimeErrors, []);
    console.log('PASS: API ownership, origin checks, concurrent audit, persistence, launcher, mobile layout, admin filters and suspended account denial');
  } finally {
    await browser.close();
    await prisma.userServiceEvent.deleteMany({ where: { userService: { userId: { in: ids } } } });
    await prisma.userService.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userPermission.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
