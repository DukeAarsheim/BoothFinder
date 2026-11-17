"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAuthClient } from "@/lib/supabase/authClient";
import { setSkippedSetup } from "@/lib/vendor/setupSkip";
import { setSignedInSide } from "./roleSession";

/** How long to wait for the stored session before treating the visitor as signed out. */
const AUTH_CHECK_TIMEOUT_MS = 6000;

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
    // If the stored session never answers (a stuck browser lock, a blocked
    // network), stop waiting so pages show the sign-in form instead of loading
    // forever. A late answer still updates the state above.
    const giveUp = setTimeout(
      () => setState((s) => (s.loading ? { user: null, loading: false } : s)),
      AUTH_CHECK_TIMEOUT_MS,
    );
    return () => {
      clearTimeout(giveUp);
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  // Forget which side this browser signed in for, then end the session. The
  // page guard (components/auth/RequireSignIn.tsx) sends the visitor to sign in.
  setSignedInSide(null);
  setSkippedSetup(false);
  await getSupabaseAuthClient()?.auth.signOut();
}
