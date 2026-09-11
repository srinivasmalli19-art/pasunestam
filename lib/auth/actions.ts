'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';
import { signInSchema, signUpSchema } from './schemas';

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const message = 'Wrong email or password. Please check and try again.';
    redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
  }

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
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/login?checkEmail=1');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
