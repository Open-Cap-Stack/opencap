/**
 * Next.js Edge Middleware — Server-Side Route Protection
 * Issue #518: Next.js server-side route protection
 */

import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'session';

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/pricing',
  '/onboarding',
  '/company-setup',
  '/auth/',
  '/api/',
  '/_next/',
  '/favicon',
  '/public',
];

// Exact paths that are public (no auth needed)
const PUBLIC_EXACT = new Set(['/']);

function isPublicRoute(pathname) {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get(SESSION_COOKIE)?.value ||
    request.cookies.get('token')?.value;

  if (sessionCookie) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|woff2?|ttf|otf|eot)|login|register|pricing|auth/|api/).*)',
  ],
};
