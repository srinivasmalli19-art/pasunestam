import { cookies, headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { resolveSiteUrl } from '@/lib/auth/action-link';
import { authorizationUrl, discover, encodeTransaction, getSlcConfig, newTransaction, SLC_CALLBACK_PATH, SLC_TXN_COOKIE } from '@/lib/auth/slc';
import { safeNext } from '@/lib/safe-next';

/** Starts "Sign in with SLC Account" (staff: editors and admins). */
export async function GET(request: NextRequest) {
  const config = getSlcConfig();
  if (!config) return NextResponse.redirect(new URL('/login', request.url));

  const h = await headers();
  const site = resolveSiteUrl(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'));
  const txn = newTransaction(safeNext(request.nextUrl.searchParams.get('next')));

  let discovery;
  try {
    discovery = await discover(config);
  } catch {
    const msg = 'SLC sign-in is unavailable right now. Please try again shortly.';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, site));
  }

  const cookieStore = await cookies();
  cookieStore.set(SLC_TXN_COOKIE, encodeTransaction(txn), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // the callback is a top-level redirect back from SLC
    maxAge: 600,
    path: '/auth/slc',
  });

  return NextResponse.redirect(authorizationUrl(discovery.authorization_endpoint, config, `${site}${SLC_CALLBACK_PATH}`, txn));
}
