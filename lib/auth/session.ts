import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/firebase/proxy';

export interface CurrentUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/**
 * The direct replacement for the old `supabase.auth.getUser()` call: reads
 * and verifies the session cookie independently of proxy.ts's own check,
 * since Next's docs recommend Proxy not be the sole authorization layer.
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

const SESSION_EXPIRES_IN_MS = 14 * 24 * 60 * 60 * 1000; // Firebase's hard maximum for session cookies.

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
}

export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_EXPIRES_IN_MS / 1000;
export { SESSION_COOKIE_NAME };
