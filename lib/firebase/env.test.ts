import { describe, expect, it } from 'vitest';
import { normalizePrivateKey } from './env';

const KEY_BODY = '-----BEGIN PRIVATE KEY-----\\nMIIEvg==\\n-----END PRIVATE KEY-----\\n';

describe('normalizePrivateKey', () => {
  it('converts literal \\n sequences to real newlines', () => {
    expect(normalizePrivateKey(KEY_BODY)).toBe('-----BEGIN PRIVATE KEY-----\nMIIEvg==\n-----END PRIVATE KEY-----\n');
  });

  it('strips a pasted pair of surrounding double quotes (the Vercel gotcha)', () => {
    expect(normalizePrivateKey(`"${KEY_BODY}"`)).toBe('-----BEGIN PRIVATE KEY-----\nMIIEvg==\n-----END PRIVATE KEY-----\n');
  });

  it('strips a pair of surrounding single quotes too', () => {
    expect(normalizePrivateKey(`'${KEY_BODY}'`)).toBe('-----BEGIN PRIVATE KEY-----\nMIIEvg==\n-----END PRIVATE KEY-----\n');
  });

  it('leaves an unquoted value with real newlines usable as-is (pasting the raw PEM works too)', () => {
    const real = '-----BEGIN PRIVATE KEY-----\nMIIEvg==\n-----END PRIVATE KEY-----\n';
    // trim() drops a trailing newline, which PEM parsers don't require — the
    // BEGIN/END markers and body are what matter, and those are unchanged.
    expect(normalizePrivateKey(real)).toBe('-----BEGIN PRIVATE KEY-----\nMIIEvg==\n-----END PRIVATE KEY-----');
  });

  it('does not strip an unmatched leading quote with no matching trailing quote', () => {
    expect(normalizePrivateKey(`"${KEY_BODY}`)).toBe(`"-----BEGIN PRIVATE KEY-----\nMIIEvg==\n-----END PRIVATE KEY-----\n`);
  });
});
