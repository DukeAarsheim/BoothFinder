"use client";

import Link from "next/link";
import { getSignedInSide } from "@/lib/auth/roleSession";
import { SIGN_IN_ROLES } from "@/lib/auth/roles";
import { signOut, useAuthUser } from "@/lib/auth/useAuthUser";

/**
 * The home page's "Sign in" link. For a visitor who is already signed in it
 * becomes "Open your dashboard" (the side they signed in for) plus "Sign out",
 * so going back to the home page visibly keeps them signed in. Until the
 * stored session has been checked it shows the plain "Sign in" link, which is
 * also what the server renders.
 */
export default function HeaderAuthLink({ className }: { className: string }) {
  const { user, loading } = useAuthUser();
  const side = loading || !user ? null : getSignedInSide();

  if (!side) {
    return (
      <Link href="/start" className={className}>
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link href={SIGN_IN_ROLES[side].destination} className={className}>
        Open your dashboard
      </Link>
      <button type="button" onClick={() => signOut()} className={`${className} cursor-pointer`}>
        Sign out
      </button>
    </>
  );
}
