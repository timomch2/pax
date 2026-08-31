import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const path = req.nextUrl?.pathname ?? '';

    // Redirect logged-in users away from auth pages
    if (token && !(token as any).authInvalid && (path === '/login' || path === '/register')) {
      const role = token?.role as string;
      if (role === 'PRACTITIONER' || role === 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Protect dashboard routes
    if (isProtectedPath(path) && (!token || (token as any).authInvalid)) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl?.pathname ?? '';
        if (isProtectedPath(path)) {
          return !!token && !(token as any).authInvalid;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/innovator/:path*',
    '/investor/:path*',
    '/employer/:path*',
    '/policymaker/:path*',
    '/login',
    '/register',
  ],
};

function isProtectedPath(path: string): boolean {
  return ['/dashboard', '/admin', '/innovator', '/investor', '/employer', '/policymaker']
    .some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
