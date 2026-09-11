import Link from 'next/link';

export default function Logo() {
  return (
    <Link
      href="/"
      style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        fontSize: '1.25rem',
        color: 'var(--ink)',
        textDecoration: 'none',
      }}
    >
      Pasunestam <span style={{ fontFamily: 'var(--font-telugu)' }}>పశు నేస్తం</span>
    </Link>
  );
}
