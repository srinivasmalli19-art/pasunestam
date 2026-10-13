// Sends email through Resend (https://resend.com) from our own domain, e.g.
// "Pasunestam <noreply@pasunestam.com>". Sending from a domain with SPF, DKIM
// and DMARC set up is what keeps these emails out of spam — Firebase's
// built-in sender (noreply@<project>.firebaseapp.com) has none of that for
// our domain, which is why its emails tended to land in spam.
//
// Needs RESEND_API_KEY (and optionally EMAIL_FROM). Without them,
// isEmailConfigured() is false and callers fall back to Firebase's sender.

import type { EmailContent } from './templates';

const DEFAULT_FROM = 'Pasunestam <noreply@pasunestam.com>';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(to: string, content: EmailContent): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set.');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [to],
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend rejected the email (${res.status}): ${detail.slice(0, 300)}`);
  }
}
