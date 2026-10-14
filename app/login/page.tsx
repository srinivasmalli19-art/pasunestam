import Link from 'next/link';
import { signIn } from '@/lib/auth/actions';
import { getSlcConfig } from '@/lib/auth/slc';

export default async function LoginPage(props: PageProps<'/login'>) {
  const params = await props.searchParams;
  const next = typeof params.next === 'string' ? params.next : '';
  const error = typeof params.error === 'string' ? params.error : '';
  const checkEmail = params.checkEmail === '1';
  const passwordReset = params.reset === '1';
  const slc = getSlcConfig();

  return (
    <main className="card">
      <h1>Sign in</h1>
      {checkEmail && (
        <p className="notice-text">
          Account created. We&apos;ve emailed you a link to confirm your address — open it, then sign in below.
        </p>
      )}
      {passwordReset && <p className="notice-text">Your password has been changed. Sign in with the new password.</p>}
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
        <Link href="/forgot-password">Forgot password?</Link>
      </p>
      {slc && (
        <p className="slc-signin">
          SLC staff (editors and admins):{' '}
          <a href={`/auth/slc/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in with {slc.providerName}</a>
        </p>
      )}
      <p>
        New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>
      </p>
    </main>
  );
}
