import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'crypto';
import { mkdir, readFile } from 'fs/promises';
import https from 'node:https';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import { chromium, expect, type Page } from '@playwright/test';
import { prisma } from '@/lib/db';
import { PERMISSIONS } from '@/lib/permissions';

const database = new URL(process.env.DATABASE_URL ?? '');
assert.equal(database.pathname, '/pax_practice_test'); assert.ok(['127.0.0.1', 'localhost'].includes(database.hostname));
const origin = 'https://domanname.com';
const accounts = 'https://accounts.domanname.com';
const evidence = '/tmp/pax-practice-runtime';
const localTime = (d: Date) => new Date(d.getTime() + 10800000).toISOString().slice(0, 16);
const dateIn = (days: number) => new Date(Date.now() + days * 86400000 + 10800000).toISOString().slice(0, 10);

async function openPracticeMenu(page: Page) {
  if (await page.locator('aside').evaluate((sidebar) => sidebar.getBoundingClientRect().right <= 0)) {
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
  }
  await expect.poll(() => page.locator('aside').evaluate((sidebar) => sidebar.getBoundingClientRect().left)).toBe(0);
}

async function navigatePractice(page: Page, label: string) {
  await openPracticeMenu(page);
  const link = page.locator('aside').getByRole('link', { name: label, exact: true });
  const destination = new URL((await link.getAttribute('href'))!, page.url());
  assert.ok(destination.searchParams.get('workspace'), 'Sidebar navigation must retain the selected workspace');
  await link.click();
  await expect(page).toHaveURL(destination.href);
  await expect(link).toHaveAttribute('aria-current', 'page');
  if ((page.viewportSize()?.width ?? 1024) < 1024) {
    await expect.poll(() => page.locator('aside').evaluate((sidebar) => sidebar.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  }
}

async function main() {
  await mkdir(evidence, { recursive: true });
  const suffix = randomUUID(), password = `Local-${randomBytes(24).toString('base64url')}!`, hash = await bcrypt.hash(password, 12);
  const makeUser = (name: string, role: 'PRACTITIONER' | 'STAFF') => prisma.user.create({ data: { name, role, email: `${name.replace(/ /g, '-').toLowerCase()}-${suffix}@example.test`, password: hash, emailVerified: new Date(), hubMember: role === 'PRACTITIONER', tier: role === 'PRACTITIONER' ? 'TIER2_PROFESSIONAL' : 'TIER1_BASIC' } });
  const owner = await makeUser('Runtime Practitioner', 'PRACTITIONER'), reception = await makeUser('Runtime Reception', 'STAFF'), finance = await makeUser('Runtime Finance', 'STAFF');
  const legacy = await makeUser('Runtime Legacy Practitioner', 'PRACTITIONER');
  for (const [key, resource, action] of PERMISSIONS.filter(([key]) => ['hub.patient.read', 'hub.appointment.read', 'hub.invoice.read', 'hub.insurer.read', 'profile.read', 'profile.update'].includes(key))) {
    const permission = await prisma.permission.upsert({ where: { key }, create: { key, resource, action }, update: {} });
    await prisma.userPermission.createMany({ data: [owner, legacy].map(user => ({ userId: user.id, permissionId: permission.id, scope: 'OWN' as const })) });
  }
  const legacyInvoice = await prisma.invoice.create({ data: { practitionerId: legacy.id, invoiceNumber: `ROUTE-${suffix}`, patientName: 'Synthetic legacy patient', serviceDesc: 'Legacy route verification', totalAmount: 100 } });
  const workspace = await prisma.practiceWorkspace.create({ data: { ownerId: owner.id } });
  await prisma.practiceMember.createMany({ data: [{ workspaceId: workspace.id, userId: reception.id, roles: ['RECEPTION'] }, { workspaceId: workspace.id, userId: finance.id, roles: ['FINANCE'] }] });
  const proxy = https.createServer(
    {
      key: await readFile("/tmp/pax-talent-local-key.pem"),
      cert: await readFile("/tmp/pax-talent-local-cert.pem"),
    },
    (request, response) => {
      const upstream = http.request(
        {
          hostname: "127.0.0.1",
          port: 3001,
          path: request.url,
          method: request.method,
          headers: {
            ...request.headers,
            "x-forwarded-proto": "https",
            "x-forwarded-host": request.headers.host,
          },
        },
        (incoming) => {
          response.writeHead(incoming.statusCode || 502, incoming.headers);
          incoming.pipe(response);
        },
      );
      upstream.on("error", () => {
        if (!response.headersSent) response.writeHead(502);
        response.end();
      });
      request.pipe(upstream);
    },
  );
  await new Promise<void>((resolve) =>
    proxy.listen(8443, "127.0.0.1", resolve),
  );
  const browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: [
      "--no-proxy-server",
      "--host-resolver-rules=MAP *.domanname.com 127.0.0.1:8443, MAP domanname.com 127.0.0.1:8443",
    ],
  });
  const failures: string[] = [];
  // APIRequestContext does not inherit Chromium's local DNS mapping.
  const get = async (page: Page, url: string, options = {}) => {
    const target = new URL(url);
    const cookies = await page.context().cookies(url);
    return page.request.get(`https://127.0.0.1:8443${target.pathname}${target.search}`, {
      maxRedirects: 0, ...options,
      headers: { host: target.host, cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') },
    });
  };

  const login = async (user: typeof owner, mobile = false, hasWorkspace = true) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: mobile ? { width: 390, height: 844 } : { width: 1365, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto(`${accounts}/login?callbackUrl=${encodeURIComponent(`${origin}/practice`)}`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    const responsePromise = page.waitForResponse((r) => r.url().includes('/api/auth/callback/credentials'));
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    const authResponse = await (await responsePromise).json();
    const returned = new URL(authResponse.url, origin);
    assert.ok(!returned.searchParams.has('csrf') && !returned.searchParams.has('error'), `Sign-in failed: ${returned.searchParams.has('csrf') ? 'CSRF validation' : returned.searchParams.get('error')}`);
    await page.waitForURL(/\/practice/, { timeout: 30000 });
    await page.goto(`${origin}/dashboard/practice`);
    await expect(page.getByRole('main').getByRole('heading', { name: 'Practice Workspace', exact: true })).toBeVisible();
    if (hasWorkspace) {
      await openPracticeMenu(page);
      await expect(page.locator('aside').getByRole('link', { name: 'Facilities', exact: true })).toBeVisible();
      await expect(page.getByRole('main').getByRole('tab', { name: 'Facilities', exact: true })).toHaveCount(0);
      await page.screenshot({ path: `${evidence}/sidebar-${user.role.toLowerCase()}-${mobile ? 'mobile' : 'desktop'}.png` });
    }
    console.log(`Signed in synthetic ${user.role} account for ${mobile ? 'mobile' : 'desktop'} acceptance.`);
    return page;
  };
  try {
    const page = await login(owner);
    for (const path of ['/practice', '/practice/patients', '/practice/calendar', '/practice/bookings', '/practice/billing', '/practice/accounts', '/practice/reports', '/practice/team', '/practice/reconciliation', '/practice/profile', '/practice/finance', '/practice/finance/invoices', '/practice/finance/patients', '/practice/finance/insurers']) {
      const response = await page.goto(`${origin}${path}`);
      assert.equal(response?.status(), 200, `Route unavailable: ${path}`);
    }
    for (const [oldPath, newPath] of [['/dashboard/practice', '/practice'], ['/dashboard/calendar', '/practice/calendar'], ['/dashboard/patients', '/practice/patients'], ['/dashboard/billing', '/practice/billing'], ['/dashboard/hub/invoices', '/practice/finance/invoices']]) {
      const response = await get(page, `${origin}${oldPath}?workspace=${workspace.id}`, { maxRedirects: 0 });
      assert.equal(response.status(), 307);
      assert.equal(response.headers().location, `${origin}${newPath}?workspace=${workspace.id}`);
    }
    await page.goto(`https://practitioners.domanname.com/dashboard/practice?workspace=${workspace.id}`);
    await expect(page).toHaveURL(`${origin}/practice?workspace=${workspace.id}`);
    assert.equal((await get(page, `${origin}/practice/nonexistent`)).status(), 404);

    await navigatePractice(page, 'Team');
    const invitedEmail = `invited-${suffix}@example.test`;
    await page.getByLabel('Staff email').fill(invitedEmail);
    await page.getByLabel('Workspace access').selectOption('RECEPTION,FINANCE');
    await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
    await expect(page.getByText('Invitation queued. Delivery status is available in notification monitoring.', { exact: true })).toBeVisible();
    const invitation = await prisma.practiceInvitation.findFirstOrThrow({ where: { email: invitedEmail } });
    const invitationNotice = await prisma.notificationEvent.findUniqueOrThrow({ where: { idempotencyKey: `practice:invite:${invitation.id}` } });
    const invitationToken = String((invitationNotice.variables as any).invitationUrl).split('#')[1];
    const invitedContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
    const invitationPage = await invitedContext.newPage();
    await invitationPage.goto(`${origin}/practice/invitation#${invitationToken}`);
    await invitationPage.getByLabel('Your name').fill('Invited Runtime Staff');
    await invitationPage.getByLabel('Password', { exact: false }).fill(password);
    await invitationPage.getByRole('button', { name: 'Create staff account and accept' }).click();
    await expect(invitationPage.getByText('Invitation accepted.', { exact: false })).toBeVisible();
    const invitedUser = await prisma.user.findUniqueOrThrow({ where: { email: invitedEmail } });
    const combinedPage = await login(invitedUser, true);
    await expect(combinedPage.locator('aside').getByRole('link', { name: 'Calendar', exact: true })).toBeVisible();
    await expect(combinedPage.locator('aside').getByRole('link', { name: 'Billing', exact: true })).toBeVisible();
    await expect(combinedPage.locator('aside').getByRole('link', { name: 'Team', exact: true })).toHaveCount(0);
    await navigatePractice(page, 'Facilities');
    const facilityName = `Runtime Health Facility ${suffix}`;
    await page.getByRole('button', { name: 'Add a missing facility', exact: true }).click();
    await page.getByLabel('Facility name', { exact: false }).fill(facilityName);
    await page.getByLabel('County / state').fill(`Runtime county ${suffix}`);
    await page.getByLabel(/^Town/).fill(`Runtime town ${suffix}`);
    await page.getByLabel('Facility type').fill('Clinic');
    await page.getByRole('button', { name: 'Check and add facility', exact: true }).click();
    await expect(page.getByText('Facility added', { exact: true })).toBeVisible();
    await page.getByLabel('Consulting start date').fill(dateIn(-30));
    await page.getByLabel('Charging arrangement').selectOption('SESSION');
    await page.getByLabel('Default amount (KSh)').fill('500');
    await page.getByRole('button', { name: 'Save consulting relationship' }).click();
    await expect(page.getByText('Consulting relationship saved', { exact: true })).toBeVisible();
    const facility = await prisma.healthFacility.findFirstOrThrow({ where: { officialName: facilityName } });
    await navigatePractice(page, 'Patients');
    await page.getByRole('button', { name: 'Add patient', exact: true }).click();
    await page.getByLabel('Patient name').fill('Runtime Patient');
    await page.getByLabel('Email', { exact: true }).fill(`patient-${suffix}@example.test`);
    await page.getByRole('button', { name: 'Save patient', exact: true }).click();
    await expect(page.getByText('Patient saved', { exact: true })).toBeVisible();
    const patient = await prisma.hubPatient.findFirstOrThrow({ where: { practitionerId: owner.id, name: 'Runtime Patient' } });
    await page.getByRole('button', { name: 'Clinical notes', exact: true }).click();
    await page.getByLabel('New clinical note').fill('Private synthetic clinical note for access checks.');
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    await expect(page.getByText('Private synthetic clinical note for access checks.', { exact: true })).toBeVisible();
    await navigatePractice(page, 'Calendar');
    await page.getByRole('button', { name: 'Add appointment / meeting', exact: true }).click();
    await page.getByLabel(/^Title/).fill('Runtime consultation');
    await page.getByLabel('Patient (patient appointments only)').selectOption(patient.id);
    await page.getByLabel('Facility (optional)').selectOption(facility.id);
    await page.getByLabel('Starts (Nairobi time)').fill(localTime(new Date(Date.now() - 3600000)));
    await page.getByLabel('Ends (Nairobi time)').fill(localTime(new Date(Date.now() - 1800000)));
    await page.getByLabel('Clinical billing').selectOption('yes');
    await page.getByLabel('Clinical service name').fill('CONSULTATION');
    await page.getByLabel('Fee (KSh;').fill('500');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page.getByText('Runtime consultation', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Complete', exact: true }).click();
    await expect(page.getByText('Patient appointment · Completed', { exact: false })).toBeVisible();
    await page.screenshot({ path: `${evidence}/practitioner-calendar.png`, fullPage: true });
    await navigatePractice(page, 'Billing');
    await page.getByRole('tab', { name: 'Payers', exact: true }).click();
    await page.getByLabel('Payer type').selectOption('PATIENT');
    await page.getByLabel(/^Patient(?: \*)?$/).selectOption(patient.id);
    await page.getByRole('button', { name: 'Save payer', exact: true }).click();
    await expect(page.getByText('Runtime Patient', { exact: true }).first()).toBeVisible();
    await page.getByRole('tab', { name: 'Unbilled work', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByLabel('Runtime Patient pays').fill('500');
    await page.getByLabel('Payment due date').fill(dateIn(7));
    await page.getByRole('button', { name: 'Issue invoice', exact: true }).click();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Invoices', exact: true }).click();
    await expect(page.getByText(/KSh 500.00/).first()).toBeVisible();
    const download = page.waitForEvent('download'); await page.getByRole('link', { name: 'Download PDF' }).click(); await (await download).saveAs(`${evidence}/invoice.pdf`);
    const financePage = await login(finance, true);
    await expect(financePage.locator('aside').getByRole('link', { name: 'Calendar', exact: true })).toHaveCount(0);
    await expect(financePage.locator('aside').getByRole('link', { name: 'Team', exact: true })).toHaveCount(0);
    await navigatePractice(financePage, 'Billing');
    await financePage.getByRole('tab', { name: 'Receipts and credit', exact: true }).click();
    const payer = await prisma.practicePayer.findFirstOrThrow({ where: { workspaceId: workspace.id, patientId: patient.id } });
    await financePage.getByRole('combobox', { name: 'Payer', exact: true }).selectOption(payer.id);
    await financePage.getByLabel('Amount received (KSh)').fill('600');
    await financePage.getByLabel('Received at (Nairobi time)').fill(localTime(new Date()));
    await financePage.getByLabel(/^Method/).selectOption('MPESA');
    await financePage.getByLabel('Payment reference').fill('RUNTIME-EXTERNAL-RECEIPT');
    await financePage.getByLabel(/due; allocate/).fill('500');
    await financePage.getByRole('button', { name: 'Record receipt', exact: true }).click();
    await expect(financePage.getByText(/KSh 100.00 available credit/)).toBeVisible();
    await financePage.evaluate(() => window.scrollTo(0, 0));
    await financePage.screenshot({ path: `${evidence}/finance-mobile.png`, fullPage: true });
    assert.equal((await get(financePage, `${origin}/api/practice/${workspace.id}/calendar?from=${encodeURIComponent(new Date().toISOString())}&to=${encodeURIComponent(new Date(Date.now() + 86400000).toISOString())}`)).status(), 403);
    await navigatePractice(financePage, 'Reports');
    await financePage.getByLabel('From date').fill(dateIn(-1));
    await financePage.getByLabel('Through date').fill(dateIn(1));
    await financePage.getByRole('button', { name: 'Run report' }).click();
    await expect(financePage.getByText('Account statement', { exact: true })).toBeVisible();
    const reportDownload = financePage.waitForEvent('download'); await financePage.getByRole('link', { name: 'Download PDF' }).click(); await (await reportDownload).saveAs(`${evidence}/statement.pdf`);
    const receptionPage = await login(reception, true);
    await expect(receptionPage.locator('aside').getByRole('link', { name: 'Billing', exact: true })).toHaveCount(0);
    await navigatePractice(receptionPage, 'Patients');
    await expect(receptionPage.getByRole('button', { name: 'Clinical notes', exact: true })).toHaveCount(0);
    assert.equal((await get(receptionPage, `${origin}/api/practice/${workspace.id}/documents?kind=invoice&id=${(await prisma.practiceInvoice.findFirstOrThrow({ where: { workspaceId: workspace.id } })).id}`)).status(), 403);
    await receptionPage.evaluate(() => window.scrollTo(0, 0));
    await receptionPage.screenshot({ path: `${evidence}/reception-mobile.png`, fullPage: true });
    await navigatePractice(page, 'Booking requests');
    await page.getByLabel('Exception date').fill(dateIn(2));
    await page.getByLabel('Location or online').fill('Online');
    await page.getByLabel('Appointment type / service').fill('Consultation');
    await page.getByRole('button', { name: 'Add availability', exact: true }).click();
    await expect(page.getByText('Availability added', { exact: true })).toBeVisible();
    await page.getByLabel('Accept public booking requests').selectOption('true');
    await page.getByRole('button', { name: 'Save settings', exact: true }).click();
    await expect(page.getByText('Settings saved', { exact: true })).toBeVisible();
    const publicContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } }); const publicPage = await publicContext.newPage();
    await publicPage.goto(`${origin}/book/${workspace.bookingSlug}`);
    await publicPage.getByLabel('Appointment date').fill(dateIn(2));
    await publicPage.getByRole('button', { name: /Consultation/ }).first().click();
    await publicPage.getByLabel('Full name').fill('Public Runtime Patient');
    const publicEmail = `public-${suffix}@example.test`;
    await publicPage.getByLabel('Email address').fill(publicEmail);
    await publicPage.getByRole('button', { name: 'Send verification email', exact: true }).click();
    await expect(publicPage.getByRole('status').filter({ hasText: 'Verification email queued' })).toBeVisible();
    const booking = await prisma.practiceBookingRequest.findFirstOrThrow({ where: { workspaceId: workspace.id, email: publicEmail } });
    const notice = await prisma.notificationEvent.findUniqueOrThrow({ where: { idempotencyKey: `practice:verify:${booking.id}` } });
    const token = String((notice.variables as any).verificationUrl).split('#')[1];
    await publicPage.goto(`${origin}/book/${workspace.bookingSlug}#${token}`); await publicPage.reload();
    await publicPage.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(publicPage.getByText('Email verified. Your request is awaiting approval.', { exact: true })).toBeVisible();
    await publicPage.screenshot({ path: `${evidence}/public-booking-mobile.png`, fullPage: true });
    await navigatePractice(receptionPage, 'Booking requests');
    await receptionPage.getByRole('button', { name: 'Review request', exact: true }).click();
    await receptionPage.getByLabel(/^Decision/).selectOption('APPROVE');
    await receptionPage.getByRole('button', { name: 'Save decision', exact: true }).click();
    await expect(receptionPage.getByText('Request updated', { exact: true })).toBeVisible();
    assert.equal((await prisma.practiceBookingRequest.findUniqueOrThrow({ where: { id: booking.id } })).status, 'APPROVED');
    for (const p of [financePage, receptionPage, publicPage]) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile page must not overflow horizontally');
    const legacyPage = await login(legacy, false, false);
    for (const path of ['/practice/patients', '/practice/calendar', '/practice/billing', '/practice/finance', '/practice/finance/patients', '/practice/finance/insurers', '/practice/finance/invoices', `/practice/finance/invoices/${legacyInvoice.id}`]) {
      assert.equal((await legacyPage.goto(`${origin}${path}`))?.status(), 200);
      await expect(legacyPage.getByText('You do not have access to Practice Finance.')).toHaveCount(0);
    }
    await expect(legacyPage.getByText(legacyInvoice.invoiceNumber, { exact: false }).first()).toBeVisible();
    await legacyPage.goto(`${origin}/dashboard/hub/invoices/${legacyInvoice.id}?view=payments`);
    await expect(legacyPage).toHaveURL(`${origin}/practice/finance/invoices/${legacyInvoice.id}?view=payments`);
    assert.equal((await get(legacyPage, `${origin}/api/practice/${workspace.id}/patients`)).status(), 404);
    await prisma.user.update({ where: { id: owner.id }, data: { tier: 'TIER1_BASIC' } });
    assert.equal((await get(financePage, `${origin}/api/practice/${workspace.id}/finance`)).status(), 403);
    await page.reload(); await expect(page.getByText(/Your workspace is read-only/)).toBeVisible();
    console.log(JSON.stringify({ result: 'passed', workspaceId: workspace.id, evidence, journeys: ['practitioner patient and appointment', 'invoice PDF', 'finance mobile receipt and credit', 'reception privacy', 'public verified request', 'reception approval', 'membership lapse'], browserErrors: failures }));
    assert.deepEqual(failures, []);
  } catch (error) { for (const context of browser.contexts()) { for (const p of context.pages()) await p.screenshot({ path: `${evidence}/failure-${browser.contexts().indexOf(context)}.png`, fullPage: true }).catch(() => {}); } throw error; }
  finally { await browser.close(); await new Promise<void>((resolve) => proxy.close(() => resolve())); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Runtime test failed'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
