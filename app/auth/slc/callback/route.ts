import { cookies, headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { adminAuth } from '@/lib/firebase/admin';
import { signInWithCustomToken } from '@/lib/firebase/rest';
import { resolveSiteUrl } from '@/lib/auth/action-link';
import { upsertSlcProfile } from '@/lib/auth/profile';
import { createSessionCookie, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import {
  decodeTransaction,
  discover,
  exchangeCode,
  getSlcConfig,
  roleFromSlcRoles,
  slcFirebaseUid,
  SLC_CALLBACK_PATH,
  SLC_TXN_COOKIE,
  verifyIdToken,
} from '@/lib/auth/slc';
import { safeNext } from '@/lib/safe-next';

/** SLC redirects back here; verifies the sign-in and creates the normal Firebase session. */
export async function GET(request: NextRequest) {
  const h = await headers();
  const site = resolveSiteUrl(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'));
  const fail = (message: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, site));

  const config = getSlcConfig();
  if (!config) return fail('SLC sign-in is not configured.');

  const cookieStore = await cookies();
  const txn = decodeTransaction(cookieStore.get(SLC_TXN_COOKIE)?.value);
  cookieStore.delete({ name: SLC_TXN_COOKIE, path: '/auth/slc' });

  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  if (!txn || !code || params.get('state') !== txn.state) {
    return fail('SLC sign-in could not be completed. Please try again.');
  }

  let claims;
  try {
    const discovery = await discover(config);
    const idToken = await exchangeCode(discovery.token_endpoint, config, `${site}${SLC_CALLBACK_PATH}`, code, txn.verifier);
    claims = await verifyIdToken(idToken, discovery, config, txn.nonce);
  } catch (err) {
    console.warn('[slc] sign-in rejected:', err instanceof Error ? err.message : err);
    return fail('SLC sign-in could not be verified. Please try again.');
  }

  const role = roleFromSlcRoles((claims as Record<string, unknown>).roles);
  if (!role) {
    return fail('Your SLC Account has no Pasunestam editor or admin role. Ask an SLC Super Admin for access, or sign in with your vet account below.');
  }

  const uid = slcFirebaseUid(claims.sub!);
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : null;
  const name = typeof claims.name === 'string' ? claims.name : null;

  try {
    await upsertSlcProfile(uid, name, role);
    const customToken = await adminAuth.createCustomToken(uid, { slc_admin: true, slc_roles: [role], slc_email: email });
    const { idToken } = await signInWithCustomToken(customToken);
    const sessionCookie = await createSessionCookie(idToken);
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
      path: '/',
    });
  } catch (err) {
    console.error('[slc] session creation failed:', err instanceof Error ? err.message : err);
    return fail('Signed in with SLC, but the session could not be created. Please try again.');
  }

  return NextResponse.redirect(new URL(safeNext(txn.next), site));
}
