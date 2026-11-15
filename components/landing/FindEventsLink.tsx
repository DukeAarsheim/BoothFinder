"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { findEventsHref } from "@/lib/auth/access";
import { getSignedInSide } from "@/lib/auth/roleSession";
import { useAuthUser } from "@/lib/auth/useAuthUser";

/**
 * The landing page's "Find events that pay" button. For a visitor who is already
 * signed in as a vendor it opens the vendor dashboard directly, so they are not
 * asked to pick a side or sign in again. Until the stored session has been
 * checked it links to /start, which is also what the server renders.
 */
export default function FindEventsLink({ className, children }: { className: string; children: ReactNode }) {
  const { user, loading } = useAuthUser();
  const href = findEventsHref({
    hasUser: !loading && Boolean(user),
    signedInAs: loading || !user ? null : getSignedInSide(),
  });
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
