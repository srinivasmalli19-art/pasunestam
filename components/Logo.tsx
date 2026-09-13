import Link from 'next/link';

export default function Logo() {
  return (
    <Link
      href="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: 'var(--font-heading)',
        fontWeight: 800,
        fontSize: '1.3rem',
        color: 'var(--charcoal)',
        textDecoration: 'none',
        letterSpacing: '-0.01em',
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15.5" fill="#2E6A3C" />
        <g fill="#fff">
          <ellipse cx="9" cy="12" rx="2.3" ry="3.1" />
          <ellipse cx="13.6" cy="8.6" rx="2.3" ry="3.1" />
          <ellipse cx="18.4" cy="8.6" rx="2.3" ry="3.1" />
          <ellipse cx="23" cy="12" rx="2.3" ry="3.1" />
          <path d="M16 14.5c-4 0-7 4-7 7 0 2 2 3 4 2.5 1.2-.3 2-.5 3-.5s1.8.2 3 .5c2 .5 4-.5 4-2.5 0-3-3-7-7-7z" />
        </g>
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        Pasunestam
        <span style={{ fontFamily: 'var(--font-telugu)', fontWeight: 400, fontSize: '0.74rem', color: 'var(--muted)', marginTop: '3px' }}>
          పశు నేస్తం
        </span>
      </span>
    </Link>
  );
}
