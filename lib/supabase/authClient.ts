"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// The anon key and the newer "publishable" key do the same job; accept either name.
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

/**
 * Browser-only Supabase client for sign-in (Supabase Auth).
 *
 * Separate from lib/supabase/client.ts on purpose: that one is session-less and
 * shared with Server Components for reading events. This one keeps the signed-in
 * session in the browser (localStorage) and completes OAuth redirects.
 *
 * Uses the public key only. Returns null when the env vars are missing.
 */
export function getSupabaseAuthClient(): SupabaseClient | null {
  if (!url || !publicKey || typeof window === "undefined") return null;
  client ??= createClient(url, publicKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return client;
}

/** Which sign-in methods the Supabase project has switched on. */
export type AuthProviders = { email: boolean; google: boolean };

/**
 * Reads the project's public auth settings, so the sign-in page only offers
 * providers that are actually enabled in the Supabase dashboard.
 * Returns null if the settings can't be read.
 */
export async function fetchAuthProviders(): Promise<AuthProviders | null> {
  if (!url || !publicKey) return null;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publicKey } });
    if (!res.ok) return null;
    const { external } = (await res.json()) as { external?: Record<string, boolean> };
    return {
      email: external?.email ?? false,
      google: external?.google ?? false,
    };
  } catch {
    return null;
  }
}
