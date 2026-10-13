import { describe, expect, it } from 'vitest';
import { passwordResetEmail, verificationEmail } from './templates';

const LINK = 'https://pasunestam.com/auth/action?mode=verifyEmail&oobCode=abc';

describe('verificationEmail', () => {
  it('includes the link in both the HTML and plain-text parts', () => {
    const email = verificationEmail(LINK, 'Srinivas');
    expect(email.subject).toBe('Confirm your Pasunestam account');
    expect(email.text).toContain(LINK);
    expect(email.html).toContain('https://pasunestam.com/auth/action?mode=verifyEmail&amp;oobCode=abc');
    expect(email.text).toContain('Hello Srinivas,');
  });

  it('escapes HTML in the name', () => {
    expect(verificationEmail(LINK, '<b>x</b>').html).not.toContain('<b>x</b>');
  });

  it('works without a name', () => {
    expect(verificationEmail(LINK).text.startsWith('Hello,')).toBe(true);
  });
});

describe('passwordResetEmail', () => {
  it('has a clear subject and the link', () => {
    const email = passwordResetEmail(LINK);
    expect(email.subject).toBe('Reset your Pasunestam password');
    expect(email.text).toContain(LINK);
  });
});
