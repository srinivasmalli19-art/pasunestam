// Firebase Auth's password sign-in normally goes through the client-side JS
// SDK, but Google also publishes it as a plain REST API (the "Identity
// Toolkit" API). Calling that directly from Server Actions lets this app
// keep its existing server-only <form action={...}> architecture — no
// client Firebase SDK, no extra client bundle.
// Reference: https://firebase.google.com/docs/reference/rest/auth

import { getPublicFirebaseApiKey, usingEmulators } from './env';

function identityToolkitUrl(method: string): string {
  const apiKey = getPublicFirebaseApiKey();
  const base = usingEmulators()
    ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`
    : 'https://identitytoolkit.googleapis.com/v1';
  return `${base}/accounts:${method}?key=${apiKey}`;
}

export class IdentityToolkitError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'An account with this email already exists.',
  EMAIL_NOT_FOUND: 'Wrong email or password. Please check and try again.',
  INVALID_PASSWORD: 'Wrong email or password. Please check and try again.',
  INVALID_LOGIN_CREDENTIALS: 'Wrong email or password. Please check and try again.',
  USER_DISABLED: 'This account has been disabled. Contact an administrator.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please wait a few minutes and try again.',
  WEAK_PASSWORD: 'Password must be at least 6 characters.',
  INVALID_EMAIL: 'Enter a valid email address.',
};

/** Maps an Identity Toolkit error code (or "CODE : detail" string) to a friendly message. */
export function friendlyAuthError(rawCode: string): string {
  const code = rawCode.split(' ')[0];
  return ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

async function callIdentityToolkit<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(identityToolkitUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) {
    const code: string = json?.error?.message ?? 'UNKNOWN_ERROR';
    throw new IdentityToolkitError(code, friendlyAuthError(code));
  }
  return json as T;
}

export interface SignUpResult {
  idToken: string;
  localId: string;
  email: string;
}

export function signUpWithPassword(email: string, password: string): Promise<SignUpResult> {
  return callIdentityToolkit<SignUpResult>('signUp', { email, password });
}

export interface SignInResult {
  idToken: string;
  localId: string;
  email: string;
}

export function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  return callIdentityToolkit<SignInResult>('signInWithPassword', { email, password });
}

export function sendEmailVerification(idToken: string): Promise<void> {
  return callIdentityToolkit('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken });
}

/**
 * Decodes (without verifying — it was just returned to us directly by Google
 * over HTTPS in this same request, so it's already trustworthy) the standard
 * OIDC claims off a fresh ID token, to read `email_verified` without an
 * extra round trip.
 */
export function decodeIdTokenClaims(idToken: string): { email_verified?: boolean; sub?: string } {
  const payload = idToken.split('.')[1];
  if (!payload) return {};
  const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
