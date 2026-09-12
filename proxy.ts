import type { NextRequest } from 'next/server';
import { checkSession } from '@/lib/firebase/proxy';

export function proxy(request: NextRequest) {
  return checkSession(request);
}

export const config = {
  matcher: [
    // Run on every page, but skip static files and image optimization so
    // CSS, JS and images never get blocked by an auth check.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
