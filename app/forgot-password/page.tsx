import Link from 'next/link';
import { requestPasswordReset } from '@/lib/auth/actions';

export const metadata = { title: 'Forgot password · Pasunestam' };

export default async function ForgotPasswordPage(props: PageProps<'/forgot-password'>) {
  const params = await props.searchParams;
  const error = typeof params.error === 'string' ? params.error : '';
  const sent = typeof params.sent === 'string' ? params.sent : '';

  return (
    <main className="card">
      <h1>Forgot password</h1>
      {sent ? (
        <>
          <p className="notice-text">
            If an account exists for {sent}, we&apos;ve emailed it a link to choose a new password. The link works once
            and expires in one hour.
          </p>
          <p>
            <Link href="/login">Back to sign in</Link>
          </p>
        </>
      ) : (
        <>
          <p>Enter the email you signed up with and we&apos;ll send you a link to choose a new password.</p>
          {error && <p className="error-text">{error}</p>}
          <form action={requestPasswordReset}>
            <label className="field">
              Email
              <input type="email" name="email" required autoComplete="email" />
            </label>
            <button type="submit" className="button-primary">
              Send reset link
            </button>
          </form>
          <p>
            Remembered it? <Link href="/login">Sign in</Link>
          </p>
        </>
      )}
    </main>
  );
}
