// Landing page for the links in our account emails:
//   /auth/action?mode=verifyEmail&oobCode=...   → confirms the email address
//   /auth/action?mode=resetPassword&oobCode=... → lets the user pick a new password
import Link from 'next/link';
import { resetPassword } from '@/lib/auth/actions';
import { applyEmailVerificationCode, checkPasswordResetCode, IdentityToolkitError } from '@/lib/firebase/rest';

export const metadata = { title: 'Account · Pasunestam' };
export const dynamic = 'force-dynamic';

function failureMessage(e: unknown): string {
  return e instanceof IdentityToolkitError ? e.message : 'Something went wrong. Please try again.';
}

export default async function AuthActionPage(props: PageProps<'/auth/action'>) {
  const params = await props.searchParams;
  const mode = typeof params.mode === 'string' ? params.mode : '';
  const oobCode = typeof params.oobCode === 'string' ? params.oobCode : '';
  const error = typeof params.error === 'string' ? params.error : '';

  if (!oobCode || (mode !== 'verifyEmail' && mode !== 'resetPassword')) {
    return (
      <main className="card">
        <h1>Link not recognised</h1>
        <p className="error-text">This link is incomplete. Please use the button in the email, or request a new link.</p>
        <p>
          <Link href="/login">Go to sign in</Link>
        </p>
      </main>
    );
  }

  if (mode === 'verifyEmail') {
    let failure = '';
    try {
      await applyEmailVerificationCode(oobCode);
    } catch (e) {
      failure = failureMessage(e);
    }
    return (
      <main className="card">
        <h1>{failure ? 'Could not confirm your email' : 'Email confirmed'}</h1>
        {failure ? (
          <p className="error-text">
            {failure} Signing in with your email and password sends a fresh confirmation link.
          </p>
        ) : (
          <p className="notice-text">Thank you — your email address is confirmed. You can now sign in.</p>
        )}
        <p>
          <Link href="/login" className="button-primary">
            Sign in
          </Link>
        </p>
      </main>
    );
  }

  let email = '';
  let failure = '';
  try {
    email = (await checkPasswordResetCode(oobCode)).email;
  } catch (e) {
    failure = failureMessage(e);
  }

  if (failure) {
    return (
      <main className="card">
        <h1>Reset link not valid</h1>
        <p className="error-text">{failure}</p>
        <p>
          <Link href="/forgot-password">Send a new reset link</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="card">
      <h1>Choose a new password</h1>
      <p>For {email}</p>
      {error && <p className="error-text">{error}</p>}
      <form action={resetPassword}>
        <input type="hidden" name="oobCode" value={oobCode} />
        <label className="field">
          New password
          <input type="password" name="password" required minLength={8} autoComplete="new-password" />
        </label>
        <label className="field">
          Repeat new password
          <input type="password" name="confirm" required minLength={8} autoComplete="new-password" />
        </label>
        <button type="submit" className="button-primary">
          Save new password
        </button>
      </form>
    </main>
  );
}
