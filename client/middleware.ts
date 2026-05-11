/**
 * Next.js Edge Middleware — Server-Side Route Protection
 *
 * Issue #518: Next.js server-side route protection
 *
 * AUTH ARCHITECTURE NOTE
 * ----------------------
 * The client uses a localStorage-based auth strategy (see lib/authService.js and
 * lib/AuthContext.jsx).  Edge middleware runs before the browser executes JavaScript,
 * so it cannot read localStorage directly.
 *
 * Defence-in-depth strategy implemented here:
 *   1. Primary guard  — check for a `session` cookie that the server sets on login
 *                       (if the backend is updated to issue one alongside the JWT).
 *   2. Secondary guard — fall back to an `Authorization` header for API requests.
 *   3. Client guard   — ProtectedRoute component in (dashboard)/layout.jsx covers
 *                       the case where neither cookie nor header is present
 *                       (e.g., a user who logged in before this middleware was
 *                       deployed and has only a localStorage token).
 *
 * This file focuses on routes under /(dashboard) which map to paths like:
 *   /documents, /equity-plans, /fundraise, /reports, /securities,
 *   /settings, /share-classes, /stakeholders, /valuations
 *
 * Routes explicitly allowed without authentication:
 *   /login, /register, /auth/*, /api/*
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Cookie name set by the backend on successful login. */
const SESSION_COOKIE = 'session';

/**
 * Routes that should always pass through without an auth check.
 * Patterns are tested against request.nextUrl.pathname.
 */
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/auth/',   // OAuth callbacks: /auth/github/callback, /auth/google/callback, etc.
  '/api/',    // Next.js API routes (or proxied backend routes) handle their own auth
  '/_next/',  // Next.js internal assets
  '/favicon',
  '/public',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Always allow public routes through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // --- Cookie-based session check ---
  // If the backend sets a `session` (or `token`) cookie on login, we can
  // validate the presence here without decoding the JWT (signature verification
  // must be done in the API layer).
  const sessionCookie =
    request.cookies.get(SESSION_COOKIE)?.value ||
    request.cookies.get('token')?.value;

  if (sessionCookie) {
    // Cookie present — allow through. The API will enforce JWT validity.
    return NextResponse.next();
  }

  // --- Authorization header check (API / SSR requests) ---
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return NextResponse.next();
  }

  // --- No server-side session signal found ---
  //
  // If the user has only a localStorage token (i.e., they logged in before
  // server-set cookies were introduced), this middleware will redirect them to
  // /login even though their client-side session is valid.  The ProtectedRoute
  // component in (dashboard)/layout.jsx will re-check after hydration and
  // redirect back to the correct page if the localStorage token is valid,
  // creating a transparent experience for existing sessions.
  //
  // To fully resolve this, update /api/v1/auth/login on the backend to also
  // issue a HttpOnly, Secure, SameSite=Strict cookie named `session` containing
  // the same JWT.  Once that is in place, this middleware will work seamlessly
  // for all new logins without relying on the client-side fallback.

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);

  return NextResponse.redirect(loginUrl);
}

/**
 * Matcher — apply this middleware only to dashboard routes.
 *
 * The /(dashboard) route group in Next.js maps to these top-level paths:
 *   /documents, /equity-plans, /fundraise, /reports, /securities,
 *   /settings, /share-classes, /stakeholders, /valuations
 *
 * We also guard the root path since it likely redirects into the dashboard.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimisation)
     *   - favicon.ico
     *   - /login, /register, /auth/*, /api/*  (handled above by isPublicRoute)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|register|auth/|api/).*)',
  ],
};
