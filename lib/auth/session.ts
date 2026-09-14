import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/firebase/proxy';
import { safeNext } from '@/lib/safe-next';

export interface CurrentUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/**
 * The real, cryptographic session check — proxy.ts only checks that a
 * session cookie exists (an "optimistic" check, since verifying it there
 * needs firebase-admin, which doesn't load in Vercel's Proxy bundle; see
 * lib/firebase/proxy.ts). This is that real check, safe to call from any
 * Server Component/Action, which run as regular server-rendered requests
 * rather than the Proxy bundle.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie);
    return { uid: decoded.uid, email: decoded.email ?? '', emailVerified: decoded.email_verified ?? false };
  } catch {
    return null;
  }
}

/**
 * For the top of a protected area (e.g. app/desk/layout.tsx): does the real
 * verification and redirects to /login if the cookie is missing, forged or
 * expired — proxy.ts's cookie-presence check alone doesn't catch those.
 */
export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = nextPath ? safeNext(nextPath) : undefined;
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  }
  return user;
}

const SESSION_EXPIRES_IN_MS = 14 * 24 * 60 * 60 * 1000; // Firebase's hard maximum for session cookies.

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
}

export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_EXPIRES_IN_MS / 1000;
export { SESSION_COOKIE_NAME };
