'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';
import type { Database } from './database.types';

// One Supabase client for use inside Client Components ('use client' files).
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
