import { afterEach, describe, expect, it } from 'vitest';
import { buildActionUrl, resolveSiteUrl } from './action-link';

const FIREBASE_LINK =
  'https://pasunestam.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=ABC123-_x&apiKey=k&lang=en';

describe('buildActionUrl', () => {
  it('moves the one-time code onto our own /auth/action page', () => {
    expect(buildActionUrl(FIREBASE_LINK, 'https://pasunestam.com', 'verifyEmail')).toBe(
      'https://pasunestam.com/auth/action?mode=verifyEmail&oobCode=ABC123-_x'
    );
  });

  it('uses the requested mode, not the one in the Firebase link', () => {
    expect(buildActionUrl(FIREBASE_LINK, 'https://pasunestam.com', 'resetPassword')).toContain('mode=resetPassword');
  });

  it('does not carry the API key over', () => {
    expect(buildActionUrl(FIREBASE_LINK, 'https://pasunestam.com', 'verifyEmail')).not.toContain('apiKey');
  });

  it('throws when the link has no code', () => {
    expect(() => buildActionUrl('https://x.firebaseapp.com/__/auth/action', 'https://pasunestam.com', 'verifyEmail')).toThrow();
  });
});

describe('resolveSiteUrl', () => {
  afterEach(() => {
    delete process.env.SITE_URL;
  });

  it('prefers SITE_URL and strips a trailing slash', () => {
    process.env.SITE_URL = 'https://pasunestam.com/';
    expect(resolveSiteUrl('preview.vercel.app', 'https')).toBe('https://pasunestam.com');
  });

  it('falls back to the request host', () => {
    expect(resolveSiteUrl('pasunestam.com', 'https')).toBe('https://pasunestam.com');
  });

  it('uses http for localhost', () => {
    expect(resolveSiteUrl('localhost:3000', null)).toBe('http://localhost:3000');
  });
});
