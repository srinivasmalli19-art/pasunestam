import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './env';
import type { Database } from './database.types';

// A fresh Supabase client for one request: Server Components, Server Actions,
// Route Handlers. Never share this across requests.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components can't set cookies during render. proxy.ts already
          // refreshes the session on every request, so this is safe to ignore.
        }
      },
    },
  });
}
