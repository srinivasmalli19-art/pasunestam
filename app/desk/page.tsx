import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { getProfile } from '@/lib/auth/profile';
import { getPublishedTemplates } from '@/lib/certificates/queries';

// proxy.ts already redirects signed-out visitors to /login before this
// renders, so `user` is always present here.
export default async function DeskPage() {
  const user = await getCurrentUser();

  const [profile, templates] = await Promise.all([getProfile(user!.uid), getPublishedTemplates()]);

  const name = profile?.fullName || user!.email;

  return (
    <main className="container">
      <p className="hello" style={{ color: 'var(--leaf)', fontWeight: 600 }}>
        Good day, Doctor
      </p>
      <h1>Welcome, {name}</h1>
      <p>
        Signed in as {user!.email} ({profile?.role ?? 'vet'}).
      </p>

      <h2 style={{ fontSize: '1.3rem' }}>Issue a certificate</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {templates.map((t) => (
          <Link
            key={t.key}
            href={`/desk/certificates/new/${t.key}`}
            className="button-ghost"
            style={{ width: 'auto', justifyContent: 'flex-start' }}
          >
            {t.name}
          </Link>
        ))}
      </div>

      <p className="muted">Schemes, news and the monthly return will appear here in later phases.</p>
    </main>
  );
}
