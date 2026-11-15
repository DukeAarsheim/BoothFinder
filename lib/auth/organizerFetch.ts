"use client";

import { getSupabaseAuthClient } from "@/lib/supabase/authClient";

/** Attach the current access token only to our own organizer API routes. */
export async function organizerFetch(
  path: "/api/events" | "/api/extract" | "/api/organizer-assistant",
  init: RequestInit,
): Promise<Response> {
  const client = getSupabaseAuthClient();
  const { data, error } = client ? await client.auth.getSession() : { data: { session: null }, error: null };
  if (error || !data.session?.access_token) {
    return Response.json({ error: "Sign in as an approved organizer to continue." }, { status: 401 });
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(path, { ...init, headers });
}
