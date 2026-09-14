import { requireUser } from '@/lib/auth/session';

// The real (cryptographic) sign-in check for the whole /desk area — see
// lib/firebase/proxy.ts for why that only does an optimistic cookie-presence
// check rather than this. Runs once per request before any nested page, so
// every current and future page under /desk is covered without repeating
// this call in each one.
export default async function DeskLayout({ children }: LayoutProps<'/desk'>) {
  await requireUser();
  return children;
}
