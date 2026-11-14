import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let admin: SupabaseClient<Database> | null = null;

/**
 * Supabase client that uses the service-role key. SERVER ONLY.
 *
 * The service-role key skips row-level security, so this client can write to
 * every table and read `ratings`. Use it only in route handlers, server actions,
 * and Server Components. The `server-only` import above makes the build fail if
 * this file is ever imported into client code (MASTER.md §5a).
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY or the project URL is missing.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  admin ??= createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}
