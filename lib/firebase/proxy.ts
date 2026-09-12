import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from './admin';
import { safeNext } from '../safe-next';

// Pages that require the vet (or editor/admin) to be signed in.
const PROTECTED_PREFIXES = ['/desk', '/admin'];
export const SESSION_COOKIE_NAME = 'session';

// Runs on every request (see proxy.ts). This is an "optimistic" check, as
// Next's own docs recommend (Proxy shouldn't be the sole authorization
// layer) — lib/auth/session.ts's getCurrentUser() re-verifies independently
// in every protected Server Component/Action.
export async function checkSession(request: NextRequest): Promise<NextResponse> {
  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const signedIn = cookie ? await verifySessionCookie(cookie) : false;

  if (!signedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', safeNext(request.nextUrl.pathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function verifySessionCookie(cookie: string): Promise<boolean> {
  try {
    await adminAuth.verifySessionCookie(cookie);
    return true;
  } catch {
    return false;
  }
}
