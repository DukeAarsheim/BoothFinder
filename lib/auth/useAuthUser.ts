"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAuthClient } from "@/lib/supabase/authClient";

/**
 * The signed-in Supabase user, or null. `loading` is true until the stored
 * session has been checked (and any OAuth redirect has been completed).
 */
export function useAuthUser() {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      queueMicrotask(() => setState({ user: null, loading: false }));
      return;
    }
    // Fires once with the initial session, then on every sign-in and sign-out.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOut() {
  await getSupabaseAuthClient()?.auth.signOut();
}
