// Only ever redirect to a path inside our own app. Without this, a link like
// /login?next=https://evil.example could send a signed-in vet somewhere else.
export function safeNext(next: string | null | undefined, fallback = '/desk'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}
