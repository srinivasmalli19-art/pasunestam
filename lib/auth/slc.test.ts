import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose';

import {
  authorizationUrl,
  decodeTransaction,
  discover,
  encodeTransaction,
  exchangeCode,
  getSlcConfig,
  newTransaction,
  resetSlcCaches,
  roleFromSlcRoles,
  slcFirebaseUid,
  verifyIdToken,
} from './slc';

let server: http.Server;
let issuer: string;
let key: KeyLike;
let lastTokenRequest: URLSearchParams | null = null;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  key = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/realms/slc/.well-known/openid-configuration') {
      res.end(JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
        token_endpoint: `${issuer}/protocol/openid-connect/token`,
        jwks_uri: `${issuer}/protocol/openid-connect/certs`,
        end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
      }));
      return;
    }
    if (req.url === '/realms/slc/protocol/openid-connect/certs') return void res.end(JSON.stringify({ keys: [jwk] }));
    if (req.url === '/realms/slc/protocol/openid-connect/token' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        lastTokenRequest = new URLSearchParams(body);
        res.end(JSON.stringify({ id_token: 'id-token-from-slc', access_token: 'x' }));
      });
      return;
    }
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}/realms/slc`;
});

beforeEach(() => {
  resetSlcCaches();
  process.env.SLC_ISSUER_URL = issuer;
  delete process.env.SLC_CLIENT_ID;
});

afterAll(async () => {
  delete process.env.SLC_ISSUER_URL;
  await new Promise<void>((r) => server.close(() => r()));
});

const idToken = (claims: Record<string, unknown>, opts: { audience?: string } = {}) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(issuer)
    .setAudience(opts.audience ?? 'pasunestam-admin')
    .setSubject('kc-1')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);

describe('SLC sign-in helpers', () => {
  it('is off without SLC_ISSUER_URL and defaults the client id', () => {
    expect(getSlcConfig()).toMatchObject({ issuer, clientId: 'pasunestam-admin', providerName: 'SLC Account' });
    delete process.env.SLC_ISSUER_URL;
    expect(getSlcConfig()).toBeNull();
  });

  it('maps SLC roles to Pasunestam roles (fail closed)', () => {
    expect(roleFromSlcRoles(['editor', 'manager'])).toBe('admin');
    expect(roleFromSlcRoles(['admin'])).toBeNull();
    expect(roleFromSlcRoles(['editor'])).toBe('editor');
    expect(roleFromSlcRoles(['viewer'])).toBeNull();
    expect(roleFromSlcRoles('manager')).toBeNull();
    expect(roleFromSlcRoles(undefined)).toBeNull();
    expect(slcFirebaseUid('abc')).toBe('slc:abc');
  });

  it('round-trips the sign-in transaction and rejects garbage', () => {
    const txn = newTransaction('/desk/certificates');
    expect(decodeTransaction(encodeTransaction(txn))).toEqual(txn);
    expect(decodeTransaction('not-base64-json')).toBeNull();
    expect(decodeTransaction(undefined)).toBeNull();
  });

  it('builds an authorization URL with PKCE S256, state and nonce', async () => {
    const config = getSlcConfig()!;
    const discovery = await discover(config);
    const txn = newTransaction('/');
    const url = new URL(authorizationUrl(discovery.authorization_endpoint, config, 'https://pasunestam.com/auth/slc/callback', txn));
    expect(url.searchParams.get('client_id')).toBe('pasunestam-admin');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(createHash('sha256').update(txn.verifier).digest('base64url'));
    expect(url.searchParams.get('state')).toBe(txn.state);
    expect(url.searchParams.get('nonce')).toBe(txn.nonce);
  });

  it('exchanges the code with the PKCE verifier and no client secret', async () => {
    const config = getSlcConfig()!;
    const discovery = await discover(config);
    const token = await exchangeCode(discovery.token_endpoint, config, 'https://x/cb', 'the-code', 'the-verifier');
    expect(token).toBe('id-token-from-slc');
    expect(Object.fromEntries(lastTokenRequest!)).toEqual({
      grant_type: 'authorization_code',
      client_id: 'pasunestam-admin',
      code: 'the-code',
      redirect_uri: 'https://x/cb',
      code_verifier: 'the-verifier',
    });
  });

  it('verifies the ID token: signature, audience and nonce', async () => {
    const config = getSlcConfig()!;
    const discovery = await discover(config);
    const ok = await verifyIdToken(await idToken({ nonce: 'n1', roles: ['editor'] }), discovery, config, 'n1');
    expect(ok.sub).toBe('kc-1');
    await expect(verifyIdToken(await idToken({ nonce: 'other' }), discovery, config, 'n1')).rejects.toThrow(/nonce/);
    await expect(verifyIdToken(await idToken({ nonce: 'n1', azp: 'stock-admin' }), discovery, config, 'n1')).rejects.toThrow(/another app/);
    await expect(verifyIdToken(await idToken({ nonce: 'n1' }, { audience: 'stock-admin' }), discovery, config, 'n1')).rejects.toThrow();
    const { privateKey } = await generateKeyPair('RS256');
    const forged = await new SignJWT({ nonce: 'n1' }).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).setIssuer(issuer)
      .setAudience('pasunestam-admin').setSubject('kc-1').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    await expect(verifyIdToken(forged, discovery, config, 'n1')).rejects.toThrow();
  });
});
