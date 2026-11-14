import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// The anon key and the newer "publishable" key do the same job; accept either name.
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when the public Supabase env vars are set. See .env.example. */
export const isSupabaseConfigured = Boolean(url && publicKey);

let client: SupabaseClient<Database> | null = null;

/**
 * Supabase client that uses the public key. Safe in Server and Client Components.
 *
 * Row-level security makes it read-only: it can read `events` and
 * `event_vendor_lists`, and nothing else. Writes and anything touching `ratings`
 * go through server code that uses `getSupabaseAdmin()` (lib/supabase/admin.ts).
 *
 * Returns null when the env vars are missing, so callers can show a setup
 * message instead of crashing. Check `isSupabaseConfigured` first.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!url || !publicKey) return null;
  client ??= createClient<Database>(url, publicKey, {
    // No accounts in this app (MASTER.md §2), so no session handling.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
