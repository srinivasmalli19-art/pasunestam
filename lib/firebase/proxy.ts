import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '../safe-next';

// Pages that require the vet (or editor/admin) to be signed in. The
// certificate builder itself (/certificates/new/...) is deliberately public
// — filling, printing and issuing a certificate work without an account;
// only saving a draft to one's account does, gated inside the builder
// itself rather than here. /desk/certificates (the saved-drafts list) is the
// one part of the old /desk area that's still genuinely account-only.
const PROTECTED_PREFIXES = ['/desk/certificates', '/admin'];
export const SESSION_COOKIE_NAME = 'session';

/**
 * An "optimistic" check only — does a session cookie exist at all — exactly
 * as Next's own docs recommend (Proxy shouldn't be the sole authorization
 * layer). Deliberately does NOT verify the cookie cryptographically here:
 * doing so needs firebase-admin, which pulls in a dependency (jose, via
 * jwks-rsa) that's ESM-only and fails to load inside Vercel's Proxy/
 * Middleware bundle specifically (`ERR_REQUIRE_ESM`) — a platform rough
 * edge with this very new Next.js version's Proxy feature, not something
 * fixable from application code. The real, cryptographic check happens in
 * lib/auth/session.ts's requireUser(), called at the top of the protected
 * area's layout — that runs as a regular server-rendered request, not the
 * Proxy bundle, where firebase-admin works without restriction.
 */
export function checkSession(request: NextRequest): NextResponse {
  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', safeNext(request.nextUrl.pathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
