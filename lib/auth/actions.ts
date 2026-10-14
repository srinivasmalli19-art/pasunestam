'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { safeNext } from '@/lib/safe-next';
import {
  IdentityToolkitError,
  confirmPasswordReset,
  decodeIdTokenClaims,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/firebase/rest';
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from './schemas';
import { sendPasswordReset, sendVerification } from './emails';
import { createProfile } from './profile';
import { createSessionCookie, getCurrentUser, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from './session';
import { slcLogoutUrl } from './slc';
import { resolveSiteUrl } from './action-link';

export async function signIn(formData: FormData) {
  const next = safeNext(String(formData.get('next') ?? ''));
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Check your details and try again.';
    redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
  }

  let idToken: string;
  try {
    const result = await signInWithPassword(parsed.data.email, parsed.data.password);
    idToken = result.idToken;
  } catch (e) {
    const message =
      e instanceof IdentityToolkitError ? e.message : 'Wrong email or password. Please check and try again.';
    redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
  }

  const claims = decodeIdTokenClaims(idToken);
  if (!claims.email_verified) {
    // The password was right, so this is the account owner: send a fresh
    // confirmation link (the first one may have gone to spam or expired).
    let message = `Your email isn't confirmed yet. We've sent a new confirmation link to ${parsed.data.email} — open it, then sign in again.`;
    try {
      await sendVerification(parsed.data.email, idToken);
    } catch (e) {
      message =
        e instanceof IdentityToolkitError && e.code.startsWith('TOO_MANY_ATTEMPTS')
          ? 'Your email isn\'t confirmed yet. A confirmation link was sent recently — please wait a few minutes, then try again.'
          : 'Your email isn\'t confirmed yet. Please open the confirmation link we emailed you, then sign in again.';
    }
    redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
  }

  const sessionCookie = await createSessionCookie(idToken);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUp(formData: FormData) {
  const next = safeNext(String(formData.get('next') ?? ''));
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('full_name'),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Check your details and try again.';
    redirect(`/signup?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
  }

  const { email, password, fullName } = parsed.data;

  let idToken: string;
  let uid: string;
  try {
    const result = await signUpWithPassword(email, password);
    idToken = result.idToken;
    uid = result.localId;
  } catch (e) {
    const message = e instanceof IdentityToolkitError ? e.message : 'Could not create your account. Try again.';
    redirect(`/signup?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
  }

  // Direct replacement for the old Postgres handle_new_user() trigger — no
  // Cloud Function needed, so this stays on Firebase's free Spark plan.
  await createProfile(uid, fullName);
  try {
    await sendVerification(email, idToken, fullName);
  } catch {
    // Account is created either way; signing in later re-sends the link.
  }

  // Not signed in yet — email verification comes first — so `next` has to
  // survive one more hop, through /login, rather than being used directly.
  redirect(`/login?checkEmail=1&next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  if (user?.viaSlc) {
    // Staff signed in with SLC: end the shared SLC session too.
    const h = await headers();
    const site = resolveSiteUrl(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'));
    const logoutUrl = await slcLogoutUrl(site);
    if (logoutUrl) redirect(logoutUrl);
  }
  redirect('/');
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Enter a valid email address.';
    redirect(`/forgot-password?error=${encodeURIComponent(message)}`);
  }

  try {
    await sendPasswordReset(parsed.data.email);
  } catch {
    redirect(
      `/forgot-password?error=${encodeURIComponent('Could not send the reset email right now. Please try again in a few minutes.')}`
    );
  }

  // Same answer whether or not the account exists, so this page can't be
  // used to check who has an account.
  redirect(`/forgot-password?sent=${encodeURIComponent(parsed.data.email)}`);
}

export async function resetPassword(formData: FormData) {
  const oobCode = String(formData.get('oobCode') ?? '');
  const back = `/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Check the new password and try again.';
    redirect(`${back}&error=${encodeURIComponent(message)}`);
  }

  try {
    await confirmPasswordReset(oobCode, parsed.data.password);
  } catch (e) {
    const message = e instanceof IdentityToolkitError ? e.message : 'Could not change the password. Please try again.';
    redirect(`${back}&error=${encodeURIComponent(message)}`);
  }

  redirect('/login?reset=1');
}
