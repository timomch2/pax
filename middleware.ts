import { legacyPracticeRedirect } from '@/lib/practice-routes';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { productOrigins, productRoutingEnabled, safeReturnUrl, sessionCookieName } from '@/lib/product-hosts';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const routing = productRoutingEnabled();
  const origins = routing ? productOrigins() : null;
  const host = req.headers.get('host') || '';
  if (origins && !Object.values(origins).some(origin => new URL(origin).host === host)) return new NextResponse('Unknown application host', { status: 400 });
  const currentOrigin = origins ? Object.values(origins).find(origin => new URL(origin).host === host)! : req.nextUrl.origin;
  const accounts = origins?.accounts || currentOrigin;
  const authPage = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/talent/register'].includes(path);
  if (origins && authPage && currentOrigin !== accounts) {
    const target = new URL(`${path}${req.nextUrl.search}`, accounts);
    const callback = req.nextUrl.searchParams.get('callbackUrl');
    if (callback) target.searchParams.set('callbackUrl', safeReturnUrl(callback, currentOrigin));
    return NextResponse.redirect(target);
  }
  if (origins && /^\/api\/auth\/(signin|callback)(\/|$)/.test(path) && currentOrigin !== accounts) return new NextResponse('Use the accounts host to sign in', { status: 403 });
  if (path.startsWith('/api/') || path.startsWith('/_next/') || /\.[a-z0-9]+$/i.test(path)) return NextResponse.next();
  const token = await getToken({ req, ...(sessionCookieName() ? { cookieName: sessionCookieName() } : {}) });
  const active = Boolean(token && !token.authInvalid && (typeof token.sessionStartedAt !== 'number' || Date.now() / 1000 - token.sessionStartedAt < 8 * 60 * 60));
  const protectedPath = (path === '/practice' || (path.startsWith('/practice/') && path !== '/practice/invitation')) || ['/dashboard', '/admin', '/innovator', '/investor', '/employer', '/policymaker', '/account', '/marketplace/profile', '/community/profile'].some(prefix => path === prefix || path.startsWith(`${prefix}/`)) ||
    ['/talent/profile', '/talent/hiring', '/talent/applications', '/talent/messages', '/talent/saved', '/talent/admin'].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  const rootProtected = path === '/' && origins && [origins.accounts, origins.practice].includes(currentOrigin);
  if ((protectedPath || rootProtected) && !active) {
    const login = new URL('/login', accounts);
    login.searchParams.set('callbackUrl', `${currentOrigin}${path}${req.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  const practiceTarget = legacyPracticeRedirect(path);
  if (practiceTarget) {
    const target = new URL(practiceTarget, origins?.practice || currentOrigin);
    target.search = req.nextUrl.search;
    return NextResponse.redirect(target);
  }
  // Sign-in pages validate the session against PostgreSQL; an old cookie may have been revoked.
  if (origins && path === '/') {
    const target = currentOrigin === origins.talent ? '/talent' : currentOrigin === origins.practice ? '/practice' : currentOrigin === origins.accounts ? '/account' : null;
    if (target) return NextResponse.redirect(new URL(target, req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
