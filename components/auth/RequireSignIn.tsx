"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { canEnter, type Side } from "@/lib/auth/access";
import { getSignedInSide } from "@/lib/auth/roleSession";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import { isAuthConfigured } from "@/lib/supabase/authClient";
import { uiFont } from "@/lib/vendor/font";

/**
 * Wraps the pages of one side (vendor or organizer). Visitors who are not
 * signed in for that side are sent to its sign-in page; nothing inside is
 * shown until the check passes. Used in app/vendor/layout.tsx and
 * app/host/layout.tsx.
 *
 * Where sign-in isn't set up at all (no Supabase keys, e.g. a fresh clone),
 * the pages stay open so the app can still be run locally.
 */
export default function RequireSignIn({ role, children }: { role: Side; children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuthUser();

  const allowed =
    !isAuthConfigured ||
    (!loading && canEnter({ hasUser: Boolean(user), signedInAs: getSignedInSide(), role }));
  const turnedAway = isAuthConfigured && !loading && !allowed;

  useEffect(() => {
    if (turnedAway) router.replace(`/signin/${role}`);
  }, [turnedAway, router, role]);

  if (allowed) return children;
  return (
    <main
      className={`flex flex-1 items-center justify-center bg-white px-6 py-14 text-neutral-500 [color-scheme:light] ${uiFont.className}`}
    >
      <p role="status">{turnedAway ? "Taking you to sign in…" : "Checking your sign-in…"}</p>
    </main>
  );
}
