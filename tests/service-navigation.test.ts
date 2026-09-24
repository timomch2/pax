import test from 'node:test';
import assert from 'node:assert/strict';
import { encode } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { legacyPracticeRedirect, PRACTICE_SECTIONS } from '@/lib/practice-routes';
import { serviceForPath, serviceLinks } from '@/lib/service-navigation';
import { communityProfileSchema, practiceProfileSchema, vendorContactSchema } from '@/lib/service-profile-validation';

test('service links follow deployment origins and select the current service profile', () => {
  const previous = process.env.PAX_PRODUCT_ROUTING_ENABLED;
  process.env.PAX_PRODUCT_ROUTING_ENABLED = 'false';
  try {
    assert.deepEqual(serviceLinks().map(item => [item.label, item.href]), [
      ['Home', '/'], ['Medical Practitioner', '/practice'], ['Talent Marketplace', '/talent'], ['Product Marketplace', '/marketplace'], ['Knowledge Exchange', '/community'],
      ['Innovation Hub', '/innovator'], ['Investment Platform', '/investor'], ['Pharmacovigilance', '/safety'],
    ]);
    for (const [path, expected] of [['/practice/accounts', 'practice'], ['/talent/profile', 'talent'], ['/marketplace/vendor', 'market'], ['/community/profile', 'community'], ['/knowledge/example', 'community'], ['/marketplace-other', 'home'], ['/innovator/submit', 'innovation'], ['/investor/mandate', 'investment'], ['/safety', 'safety'], ['/admin/safety', 'safety'], ['/policymaker/safety', 'safety'], ['/investor-other', 'home']]) assert.equal(serviceForPath(path), expected);
    process.env.PAX_PRODUCT_ROUTING_ENABLED = 'true';
    assert.equal(serviceLinks().find(item => item.id === 'practice')!.href, serviceLinks()[0].href.replace(/\/$/, '') + '/practice');
  } finally { if (previous === undefined) delete process.env.PAX_PRODUCT_ROUTING_ENABLED; else process.env.PAX_PRODUCT_ROUTING_ENABLED = previous; }
});

test('legacy Practice redirects preserve nested invoice IDs and ignore unrelated routes', () => {
  assert.equal(legacyPracticeRedirect('/dashboard/hub/invoices/invoice-123'), '/practice/finance/invoices/invoice-123');
  assert.equal(legacyPracticeRedirect('/dashboard/calendar'), '/practice/calendar');
  assert.equal(legacyPracticeRedirect('/dashboard/practice'), '/practice');
  assert.equal(legacyPracticeRedirect('/dashboard/profile'), null);
  assert.equal(legacyPracticeRedirect('/dashboard/hubris'), null);
  assert.equal(new Set(Object.values(PRACTICE_SECTIONS).map(item => item.path)).size, Object.keys(PRACTICE_SECTIONS).length);
});

test('new Practice and service-profile URLs require authentication; invitations remain available', async () => {
  const previous = process.env.PAX_PRODUCT_ROUTING_ENABLED;
  process.env.PAX_PRODUCT_ROUTING_ENABLED = 'false';
  try {
    for (const path of ['/practice', '/practice/accounts', '/practice/billing', '/practice/finance/invoices/example', '/marketplace/profile', '/community/profile']) {
      const response = await middleware(new NextRequest(`http://localhost:3000${path}`));
      const location = new URL(response.headers.get('location')!);
      assert.equal(location.pathname, '/login');
      assert.equal(location.searchParams.get('callbackUrl'), `http://localhost:3000${path}`);
    }
    assert.equal((await middleware(new NextRequest('http://localhost:3000/practice/invitation'))).status, 200);
  } finally { if (previous === undefined) delete process.env.PAX_PRODUCT_ROUTING_ENABLED; else process.env.PAX_PRODUCT_ROUTING_ENABLED = previous; }
});

test('authenticated old Practice links redirect with their query intact', async () => {
  const routing = process.env.PAX_PRODUCT_ROUTING_ENABLED, secret = process.env.NEXTAUTH_SECRET;
  process.env.PAX_PRODUCT_ROUTING_ENABLED = 'false';
  process.env.NEXTAUTH_SECRET = 'synthetic-navigation-test-secret';
  try {
    const token = await encode({ secret: process.env.NEXTAUTH_SECRET, token: { id: 'synthetic-member', sub: 'synthetic-member', role: 'PRACTITIONER' } });
    const response = await middleware(new NextRequest('http://localhost:3000/dashboard/hub/invoices/123?view=payments', { headers: { cookie: `next-auth.session-token=${token}` } }));
    assert.equal(response.headers.get('location'), 'http://localhost:3000/practice/finance/invoices/123?view=payments');
  } finally {
    if (routing === undefined) delete process.env.PAX_PRODUCT_ROUTING_ENABLED; else process.env.PAX_PRODUCT_ROUTING_ENABLED = routing;
    if (secret === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = secret;
  }
});

test('service profile allowlists reject ownership, verification and cross-service field changes', () => {
  const community = { headline: '', organization: '', location: '', healthAreas: '', bio: 'Community work', linkedinUrl: '' };
  assert.equal(communityProfileSchema.safeParse(community).success, true);
  for (const injected of [{ userId: 'another-user' }, { consultationRate: 100 }, { role: 'ADMIN' }]) assert.equal(communityProfileSchema.safeParse({ ...community, ...injected }).success, false);
  assert.equal(communityProfileSchema.safeParse({ ...community, linkedinUrl: 'javascript:alert(1)' }).success, false);
  const practice = { specialty: 'Community medicine', hospital: '', bio: '', affiliations: '', consultationRate: '2500' };
  assert.equal(practiceProfileSchema.parse(practice).consultationRate, 2500);
  assert.equal(practiceProfileSchema.safeParse({ ...practice, consultationRate: '-1' }).success, false);
  assert.equal(practiceProfileSchema.safeParse({ ...practice, medicalRegNumber: 'changed' }).success, false);
  assert.equal(vendorContactSchema.safeParse({ contactPerson: 'Contact', contactEmail: 'contact@example.test', contactPhone: '+254700000000', status: 'APPROVED' }).success, false);
});

test('Practice uses the root domain without taking over the public homepage', async () => {
  const previous = process.env.PAX_PRODUCT_ROUTING_ENABLED;
  process.env.PAX_PRODUCT_ROUTING_ENABLED = 'true';
  try {
    const { productOrigins, legacyPracticeOrigin, safeReturnUrl } = await import('@/lib/product-hosts');
    const origins = productOrigins();
    const request = (url: string) => middleware(new NextRequest(url, { headers: { host: new URL(url).host } }));
    assert.equal((await request(origins.main + '/')).status, 200);
    for (const [source, target] of [
      [legacyPracticeOrigin() + '/', origins.main + '/practice'],
      [legacyPracticeOrigin() + '/dashboard/practice?workspace=abc', origins.main + '/practice?workspace=abc'],
      [origins.talent + '/practice/calendar?workspace=abc', origins.main + '/practice/calendar?workspace=abc'],
      [origins.main + '/book/example?date=tomorrow', origins.main + '/practice/book/example?date=tomorrow'],
    ]) assert.equal((await request(source)).headers.get('location'), target);
    for (const path of ['/practice/invitation', '/practice/book/example']) assert.equal((await request(origins.main + path)).status, 200);
    const login = new URL((await request(origins.main + '/practice/accounts?workspace=abc')).headers.get('location')!);
    assert.equal(login.origin, origins.accounts);
    assert.equal(login.searchParams.get('callbackUrl'), origins.main + '/practice/accounts?workspace=abc');
    assert.equal(safeReturnUrl(legacyPracticeOrigin() + '/practice/book/example#token', origins.accounts), origins.main + '/practice/book/example#token');
    assert.equal(safeReturnUrl(legacyPracticeOrigin().replace('https://', 'https://user@') + '/practice', origins.accounts), origins.accounts + '/hub');
    assert.equal((await request('https://unknown.example/practice')).status, 400);
  } finally { if (previous === undefined) delete process.env.PAX_PRODUCT_ROUTING_ENABLED; else process.env.PAX_PRODUCT_ROUTING_ENABLED = previous; }
});

test('services without dedicated profiles do not advertise profile links', () => {
  for (const id of ['innovation', 'investment', 'safety']) assert.equal(serviceLinks().find(s => s.id === id)?.profileHref, null);
});
