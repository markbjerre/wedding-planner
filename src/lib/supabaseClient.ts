import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Browser client with anon key + RLS. Null when env vars are missing (local-only mode). */
export const supabase: SupabaseClient | null =
  typeof url === 'string' &&
  url.length > 0 &&
  typeof anon === 'string' &&
  anon.length > 0
    ? createClient(url, anon)
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
