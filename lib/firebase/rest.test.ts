import { describe, expect, it } from 'vitest';
import { decodeIdTokenClaims, friendlyAuthError } from './rest';

describe('friendlyAuthError', () => {
  it('maps known Identity Toolkit codes to friendly text', () => {
    expect(friendlyAuthError('EMAIL_EXISTS')).toBe('An account with this email already exists.');
    expect(friendlyAuthError('INVALID_LOGIN_CREDENTIALS')).toBe('Wrong email or password. Please check and try again.');
  });

  it('strips a trailing " : detail" suffix before matching', () => {
    expect(friendlyAuthError('WEAK_PASSWORD : Password should be at least 6 characters')).toBe(
      'Password must be at least 6 characters.'
    );
  });

  it('falls back to a generic message for unknown codes', () => {
    expect(friendlyAuthError('SOMETHING_NEW')).toBe('Something went wrong. Please try again.');
  });
});

function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${base64url({ alg: 'none' })}.${base64url(payload)}.signature`;
}

describe('decodeIdTokenClaims', () => {
  it('decodes the payload segment of a JWT', () => {
    const token = fakeJwt({ email_verified: true, sub: 'abc123' });
    expect(decodeIdTokenClaims(token)).toEqual({ email_verified: true, sub: 'abc123' });
  });

  it('returns an empty object for a malformed token', () => {
    expect(decodeIdTokenClaims('not-a-jwt')).toEqual({});
  });
});
