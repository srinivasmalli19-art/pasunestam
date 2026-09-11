import Link from 'next/link';
import { signUp } from '@/lib/auth/actions';

export default async function SignupPage(props: PageProps<'/signup'>) {
  const params = await props.searchParams;
  const error = typeof params.error === 'string' ? params.error : '';

  return (
    <main className="card">
      <h1>Create an account</h1>
      {error && <p className="error-text">{error}</p>}
      <form action={signUp}>
        <label className="field">
          Full name
          <input type="text" name="full_name" required autoComplete="name" />
        </label>
        <label className="field">
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label className="field">
          Password
          <input type="password" name="password" required minLength={8} autoComplete="new-password" />
        </label>
        <button type="submit" className="button-primary">
          Create account
        </button>
      </form>
      <p>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
