import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from './env';
import { safeNext } from '../safe-next';

// Pages that require the vet (or editor/admin) to be signed in.
const PROTECTED_PREFIXES = ['/desk', '/admin'];

// Runs on every request (see proxy.ts). Refreshes the Supabase session cookie
// so it never goes stale, and sends signed-out visitors to /login.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() re-checks the token with the Supabase Auth server, unlike
  // getSession() which just trusts the cookie. Slower, but required in a
  // proxy/middleware to actually verify the session hasn't been revoked.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (!user && isProtected) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', safeNext(request.nextUrl.pathname));
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
