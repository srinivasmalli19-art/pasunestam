import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/actions';
import Logo from './Logo';
import './header.css';

const NAV_LINKS = [
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
      <input type="checkbox" id="nav-toggle" className="nav-toggle-input" />
      <nav aria-label="Main">
        <Link href={user ? '/desk' : '/login'}>Certificates</Link>
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>
      <label htmlFor="nav-toggle" className="menu-btn button-ghost button-sm">
        Menu
      </label>
      <div className="top-cta">
        {user ? (
          <>
            <Link href="/desk/certificates/new/health" className="button-primary button-sm">
              New certificate
            </Link>
            <form action={signOut}>
              <button type="submit" className="button-ghost button-sm">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="button-primary button-sm">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
