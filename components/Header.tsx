import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/actions';
import Logo from './Logo';
import './header.css';

const NAV_LINKS = [
  { href: '/knowledge', label: 'Knowledge hub' },
  { href: '/schemes', label: 'Schemes & forms' },
  { href: '/news', label: 'News' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/prices', label: 'Best prices' },
  { href: '/cases', label: 'Case digest' },
  { href: '/verify', label: 'Verify' },
];

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="top">
      <Logo />
      <nav aria-label="Main">
        <Link href="/">Certificates</Link>
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="top-cta">
        <Link href="/certificates/new/health" className="button-primary button-sm" aria-label="New certificate">
          New<span className="cta-extra">&nbsp;certificate</span>
        </Link>
        {user ? (
          <form action={signOut}>
            <button type="submit" className="button-ghost button-sm">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/login" className="button-ghost button-sm">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
