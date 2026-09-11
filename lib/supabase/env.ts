// Reads the two public Supabase settings and fails fast with a clear message
// if .env.local is missing them, instead of a confusing crash deep in a page.

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local, paste in your Supabase project's ` +
        `URL and anon key, then restart "npm run dev".`
    );
  }
  return value;
}

export function getSupabaseEnv() {
  return {
    url: readEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  };
}
