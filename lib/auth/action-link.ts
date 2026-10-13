// firebase-admin generates verification/reset links that point at Firebase's
// own page (https://<project>.firebaseapp.com/__/auth/action?...). We take
// just the one-time code out of that link and send people to our own page on
// pasunestam.com instead: the link in the email then matches the domain the
// email comes from (better for spam filters), and the page looks like ours.

export type ActionMode = 'verifyEmail' | 'resetPassword';

export function buildActionUrl(firebaseLink: string, siteUrl: string, mode: ActionMode): string {
  const oobCode = new URL(firebaseLink).searchParams.get('oobCode');
  if (!oobCode) throw new Error('Firebase action link has no oobCode.');
  const url = new URL('/auth/action', siteUrl);
  url.searchParams.set('mode', mode);
  url.searchParams.set('oobCode', oobCode);
  return url.toString();
}

/** The site's own origin, from SITE_URL if set, otherwise from the incoming request's host. */
export function resolveSiteUrl(host: string | null, proto: string | null): string {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (!host) return 'https://pasunestam.com';
  const scheme = proto ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${scheme}://${host}`;
}
