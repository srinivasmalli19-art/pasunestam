// Plain, transactional emails. Deliberately simple — no images, no tracking
// pixels, no marketing wording, a plain-text part alongside the HTML, and a
// link on our own domain — because those are the things mail providers look
// at when deciding between the inbox and spam/promotions.

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(heading: string, paragraphs: string[], buttonLabel: string, link: string, footer: string): string {
  const safeLink = escapeHtml(link);
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f6f5f1;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#1f3a5f;">Pasunestam</p>
    <h1 style="margin:16px 0 12px;font-size:20px;">${escapeHtml(heading)}</h1>
    ${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(p)}</p>`).join('\n    ')}
    <p style="margin:20px 0;">
      <a href="${safeLink}" style="display:inline-block;background:#1f3a5f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;">${escapeHtml(buttonLabel)}</a>
    </p>
    <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#4b5563;">If the button doesn't work, copy this link into your browser:<br><a href="${safeLink}" style="color:#1f3a5f;word-break:break-all;">${safeLink}</a></p>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">${escapeHtml(footer)}</p>
  </div>
</body>
</html>`;
}

export function verificationEmail(link: string, fullName?: string | null): EmailContent {
  const greeting = fullName ? `Hello ${fullName},` : 'Hello,';
  const intro = 'Please confirm your email address to finish creating your Pasunestam account.';
  const footer = "If you didn't create a Pasunestam account, you can ignore this email.";
  return {
    subject: 'Confirm your Pasunestam account',
    html: layout('Confirm your email address', [greeting, intro], 'Confirm email address', link, footer),
    text: `${greeting}\n\n${intro}\n\nConfirm your email address:\n${link}\n\n${footer}\n\n— Pasunestam`,
  };
}

export function passwordResetEmail(link: string): EmailContent {
  const intro = 'We received a request to reset the password for your Pasunestam account.';
  const note = 'This link works once and expires in one hour.';
  const footer = "If you didn't ask to reset your password, you can ignore this email — your password stays the same.";
  return {
    subject: 'Reset your Pasunestam password',
    html: layout('Reset your password', ['Hello,', intro, note], 'Choose a new password', link, footer),
    text: `Hello,\n\n${intro}\n${note}\n\nChoose a new password:\n${link}\n\n${footer}\n\n— Pasunestam`,
  };
}
