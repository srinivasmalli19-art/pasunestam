import Link from 'next/link';

export default function Home() {
  return (
    <main className="container" style={{ textAlign: 'center', paddingTop: '64px' }}>
      <p style={{ color: 'var(--leaf)', fontWeight: 600 }}>పశు నేస్తం</p>
      <h1>Every certificate, scheme and case on one desk.</h1>
      <p>
        Fill a form once, watch the certificate take shape as you type, and print it ready to
        sign. Schemes, admissions, vet news and supply prices sit right beside it.
      </p>
      <p>
        <Link href="/login" className="button-primary" style={{ display: 'inline-block', padding: '12px 20px', textDecoration: 'none' }}>
          Sign in to your desk
        </Link>
      </p>
    </main>
  );
}
