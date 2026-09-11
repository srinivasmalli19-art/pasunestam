import Link from 'next/link';
import { signIn } from '@/lib/auth/actions';

export default async function LoginPage(props: PageProps<'/login'>) {
  const params = await props.searchParams;
  const next = typeof params.next === 'string' ? params.next : '';
  const error = typeof params.error === 'string' ? params.error : '';
  const checkEmail = params.checkEmail === '1';

  return (
    <main className="card">
      <h1>Sign in</h1>
      {checkEmail && (
        <p className="notice-text">Check your email to confirm your account, then sign in below.</p>
      )}
      {error && <p className="error-text">{error}</p>}
      <form action={signIn}>
        <input type="hidden" name="next" value={next} />
        <label className="field">
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label className="field">
          Password
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button type="submit" className="button-primary">
          Sign in
        </button>
      </form>
      <p>
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </main>
  );
}
