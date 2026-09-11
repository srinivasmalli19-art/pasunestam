import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';
import Logo from './Logo';

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <Logo />
      {user ? (
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      ) : (
        <Link href="/login" className="button" style={{ padding: '10px 16px', background: 'var(--ink)', color: 'white' }}>
          Sign in
        </Link>
      )}
    </header>
  );
}
