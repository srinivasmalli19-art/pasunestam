import { createClient } from '@/lib/supabase/server';

// proxy.ts already redirects signed-out visitors to /login before this
// renders, so `user` is always present here. This is a minimal placeholder;
// the full certificate desk (search, tiles, recently issued) lands in Phase 2.
export default async function DeskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single();

  const name = profile?.full_name || user!.email;

  return (
    <main className="container">
      <p className="hello" style={{ color: 'var(--leaf)', fontWeight: 600 }}>
        Good day, Doctor
      </p>
      <h1>Welcome, {name}</h1>
      <p>
        Signed in as {user!.email} ({profile?.role ?? 'vet'}).
      </p>
      <p>Certificates, schemes, news and the monthly return will appear here next.</p>
    </main>
  );
}
