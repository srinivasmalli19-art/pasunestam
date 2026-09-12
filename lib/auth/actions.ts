'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { safeNext } from '@/lib/safe-next';
import {
  IdentityToolkitError,
  decodeIdTokenClaims,
  sendEmailVerification,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/firebase/rest';
import { signInSchema, signUpSchema } from './schemas';
import { createProfile } from './profile';
import { createSessionCookie, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from './session';

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
    const message = 'Please confirm your email before signing in. Check your inbox for the link.';
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
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('full_name'),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Check your details and try again.';
    redirect(`/signup?error=${encodeURIComponent(message)}`);
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
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  // Direct replacement for the old Postgres handle_new_user() trigger — no
  // Cloud Function needed, so this stays on Firebase's free Spark plan.
  await createProfile(uid, fullName);
  await sendEmailVerification(idToken);

  redirect('/login?checkEmail=1');
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  redirect('/');
}
