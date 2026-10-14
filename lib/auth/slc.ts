// "Sign in with SLC Account" for Pasunestam editors and admins.
//
// SLC (the SLC Technologies identity provider, Keycloak) is the one login, with
// MFA, shared by every SLC app; who is an editor or admin here is decided in
// SLC Central Admin → Admin access (client `pasunestam-admin`).
//
// Everything runs on the server, like the rest of this app's auth: the
// Authorization Code flow with PKCE (public client, no secret), the ID token
// is verified here, then a Firebase custom token is exchanged for a normal
// Firebase session cookie. Vets keep their email + password sign-in.

import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import type { UserRole } from './profile';

export const SLC_TXN_COOKIE = 'slc_txn';
export const SLC_CALLBACK_PATH = '/auth/slc/callback';

export interface SlcConfig {
  issuer: string;
  clientId: string;
  providerName: string;
}

/** SLC settings, or null when SLC sign-in is not configured. */
export function getSlcConfig(): SlcConfig | null {
  const issuer = (process.env.SLC_ISSUER_URL || '').replace(/\/$/, '');
  if (!issuer) return null;
  return {
    issuer,
    clientId: process.env.SLC_CLIENT_ID || 'pasunestam-admin',
    providerName: process.env.SLC_PROVIDER_NAME || 'SLC Account',
  };
}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

let discoveryCache: { issuer: string; value: Promise<Discovery> } | null = null;
let jwksCache: { uri: string; set: ReturnType<typeof createRemoteJWKSet> } | null = null;

export function discover(config: SlcConfig): Promise<Discovery> {
  if (!discoveryCache || discoveryCache.issuer !== config.issuer) {
    const value = fetch(`${config.issuer}/.well-known/openid-configuration`).then(async (res) => {
      if (!res.ok) throw new Error(`SLC discovery failed (${res.status})`);
      return (await res.json()) as Discovery;
    });
    value.catch(() => {
      discoveryCache = null;
    });
    discoveryCache = { issuer: config.issuer, value };
  }
  return discoveryCache.value;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

export interface SlcTransaction {
  state: string;
  nonce: string;
  verifier: string;
  next: string;
}

/** A fresh state / nonce / PKCE verifier for one sign-in attempt. */
export function newTransaction(next: string): SlcTransaction {
  return { state: b64url(randomBytes(24)), nonce: b64url(randomBytes(24)), verifier: b64url(randomBytes(48)), next };
}

export function encodeTransaction(txn: SlcTransaction): string {
  return Buffer.from(JSON.stringify(txn), 'utf8').toString('base64url');
}

export function decodeTransaction(raw: string | undefined): SlcTransaction | null {
  if (!raw || raw.length > 4096) return null;
  try {
    const t = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<SlcTransaction>;
    if (typeof t.state === 'string' && typeof t.nonce === 'string' && typeof t.verifier === 'string') {
      return { state: t.state, nonce: t.nonce, verifier: t.verifier, next: typeof t.next === 'string' ? t.next : '/' };
    }
  } catch {
    // fall through
  }
  return null;
}

export function authorizationUrl(endpoint: string, config: SlcConfig, redirectUri: string, txn: SlcTransaction): string {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state: txn.state,
    nonce: txn.nonce,
    code_challenge: b64url(createHash('sha256').update(txn.verifier).digest()),
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

/** Exchange the one-time code (PKCE) and return the raw ID token. */
export async function exchangeCode(
  tokenEndpoint: string,
  config: SlcConfig,
  redirectUri: string,
  code: string,
  verifier: string
): Promise<string> {
  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!res.ok || !body.id_token) throw new Error(`SLC token exchange failed (${body.error ?? res.status})`);
  return body.id_token;
}

/** Verify the ID token's signature, issuer, audience, expiry and nonce. */
export async function verifyIdToken(idToken: string, discovery: Discovery, config: SlcConfig, nonce: string): Promise<JWTPayload> {
  if (!jwksCache || jwksCache.uri !== discovery.jwks_uri) {
    jwksCache = { uri: discovery.jwks_uri, set: createRemoteJWKSet(new URL(discovery.jwks_uri)) };
  }
  const { payload } = await jwtVerify(idToken, jwksCache.set, { issuer: discovery.issuer, audience: config.clientId });
  if (payload.nonce !== nonce) throw new Error('SLC sign-in nonce mismatch');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('SLC token has no subject');
  return payload;
}

/**
 * Pasunestam role granted by the SLC roles for this app, or null for no access.
 * The SLC role is `manager` (not `admin`): Keycloak refuses to let SLC Central
 * Admin grant a client role named "admin". It maps to the local `admin` role.
 */
export function roleFromSlcRoles(roles: unknown): Extract<UserRole, 'admin' | 'editor'> | null {
  const list = Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
  if (list.includes('manager')) return 'admin';
  if (list.includes('editor')) return 'editor';
  return null;
}

/** Firebase uid used for an SLC staff account (separate from vets' own accounts). */
export function slcFirebaseUid(sub: string): string {
  return `slc:${sub}`;
}

/** Where to send the browser to end the shared SLC session, if supported. */
export async function slcLogoutUrl(origin: string): Promise<string | null> {
  const config = getSlcConfig();
  if (!config) return null;
  const discovery = await discover(config).catch(() => null);
  if (!discovery?.end_session_endpoint) return null;
  const url = new URL(discovery.end_session_endpoint);
  url.search = new URLSearchParams({ client_id: config.clientId, post_logout_redirect_uri: `${origin}/` }).toString();
  return url.toString();
}

/** Test hook. */
export function resetSlcCaches(): void {
  discoveryCache = null;
  jwksCache = null;
}
