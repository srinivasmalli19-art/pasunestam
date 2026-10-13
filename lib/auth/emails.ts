// Sends the account emails (verification, password reset). Uses our own
// domain via Resend when configured; otherwise falls back to Firebase's
// built-in emails so sign-up and reset keep working either way.

import { headers } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { sendEmailVerification, sendPasswordResetViaFirebase } from '@/lib/firebase/rest';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { passwordResetEmail, verificationEmail } from '@/lib/email/templates';
import { buildActionUrl, resolveSiteUrl } from './action-link';

async function siteUrl(): Promise<string> {
  const h = await headers();
  return resolveSiteUrl(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'));
}

export async function sendVerification(email: string, idToken: string, fullName?: string | null): Promise<void> {
  if (!isEmailConfigured()) {
    await sendEmailVerification(idToken);
    return;
  }
  const firebaseLink = await adminAuth.generateEmailVerificationLink(email);
  const link = buildActionUrl(firebaseLink, await siteUrl(), 'verifyEmail');
  await sendEmail(email, verificationEmail(link, fullName));
}

/**
 * Sends a reset link if the account exists. Silently does nothing for an
 * unknown email, so the form can't be used to find out who has an account.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!isEmailConfigured()) {
    try {
      await sendPasswordResetViaFirebase(email);
    } catch (e) {
      if (e instanceof Error && 'code' in e && String(e.code).startsWith('EMAIL_NOT_FOUND')) return;
      throw e;
    }
    return;
  }
  let firebaseLink: string;
  try {
    firebaseLink = await adminAuth.generatePasswordResetLink(email);
  } catch (e) {
    if ((e as { code?: string })?.code === 'auth/user-not-found') return;
    throw e;
  }
  const link = buildActionUrl(firebaseLink, await siteUrl(), 'resetPassword');
  await sendEmail(email, passwordResetEmail(link));
}
