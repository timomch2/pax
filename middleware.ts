import { legacyPracticeRedirect } from '@/lib/practice-routes';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { legacyPracticeOrigin, productOrigins, productRoutingEnabled, safeReturnUrl, sessionCookieName } from '@/lib/product-hosts';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const routing = productRoutingEnabled();
  const origins = routing ? productOrigins() : null;
  const host = req.headers.get('host') || '';
  const allowedOrigins = origins ? [...Object.values(origins), legacyPracticeOrigin()] : [];
  if (origins && !allowedOrigins.some(origin => new URL(origin).host === host)) return new NextResponse('Unknown application host', { status: 400 });
  const currentOrigin = origins ? allowedOrigins.find(origin => new URL(origin).host === host)! : req.nextUrl.origin;
  const accounts = origins?.accounts || currentOrigin;
  const authPage = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/talent/register'].includes(path);
  if (origins && authPage && currentOrigin !== accounts) {
    const target = new URL(`${path}${req.nextUrl.search}`, accounts);
    const callback = req.nextUrl.searchParams.get('callbackUrl');
    if (callback) target.searchParams.set('callbackUrl', safeReturnUrl(callback, currentOrigin));
    return NextResponse.redirect(target);
  }
  if (origins && /^\/api\/auth\/(signin|callback)(\/|$)/.test(path) && currentOrigin !== accounts) return new NextResponse('Use the accounts host to sign in', { status: 403 });
  const onboardingToken = await getToken({ req, ...(sessionCookieName() ? { cookieName: sessionCookieName() } : {}) });
  const onboardingActive = Boolean(onboardingToken && !onboardingToken.authInvalid && (typeof onboardingToken.sessionStartedAt !== 'number' || Date.now() / 1000 - onboardingToken.sessionStartedAt < 8 * 60 * 60));
  if (onboardingActive && onboardingToken && onboardingToken.accountOnboardingPending && !path.startsWith('/api/auth/') && !['/api/account/onboarding', '/api/products', '/account/onboarding', '/login', '/logout', '/privacy', '/terms', '/legal'].includes(path) && !path.startsWith('/_next/') && !/\.[a-z0-9]+$/i.test(path)) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Complete your account setup first' }, { status: 403 });
    return NextResponse.redirect(new URL('/account/onboarding', accounts));
  }
  if (onboardingActive && onboardingToken && onboardingToken.accountWelcomePending && !onboardingToken.accountOnboardingPending && ['/hub', '/dashboard/feed'].includes(path)) return NextResponse.redirect(new URL('/account', accounts));
  if (path.startsWith('/api/') || path.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(path)) return NextResponse.next();
  // Canonicalize before authentication so bookmarks and public token fragments survive.
  const practiceTarget = legacyPracticeRedirect(path);
  if (practiceTarget || (origins && currentOrigin === legacyPracticeOrigin())) {
    const target = new URL(practiceTarget || (path === '/' ? '/practice' : path), origins?.practice || currentOrigin);
    target.search = req.nextUrl.search;
    return NextResponse.redirect(target);
  }
  if (origins && (path === '/practice' || path.startsWith('/practice/')) && currentOrigin !== origins.main) {
    return NextResponse.redirect(new URL(`${path}${req.nextUrl.search}`, origins.main));
  }
  const token = onboardingToken;
  const active = Boolean(token && !token.authInvalid && (typeof token.sessionStartedAt !== 'number' || Date.now() / 1000 - token.sessionStartedAt < 8 * 60 * 60));
  const protectedPath = (path === '/practice' || (path.startsWith('/practice/') && path !== '/practice/invitation' && !/^\/practice\/book\/[^/]+$/.test(path))) || ['/dashboard', '/admin', '/innovator', '/investor', '/employer', '/policymaker', '/account', '/marketplace/profile', '/community/profile'].some(prefix => path === prefix || path.startsWith(`${prefix}/`)) ||
    ['/talent/profile', '/talent/hiring', '/talent/applications', '/talent/messages', '/talent/saved', '/talent/admin'].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  const rootProtected = path === '/' && origins && currentOrigin === origins.accounts;
  if ((protectedPath || rootProtected) && !active) {
    const login = new URL('/login', accounts);
    login.searchParams.set('callbackUrl', `${currentOrigin}${path}${req.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  // Sign-in pages validate the session against PostgreSQL; an old cookie may have been revoked.
  if (origins && path === '/') {
    const target = currentOrigin === origins.talent ? '/talent' : currentOrigin === origins.accounts ? '/account' : null;
    if (target) return NextResponse.redirect(new URL(target, req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
