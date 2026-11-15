"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { signOut, useAuthUser } from "@/lib/auth/useAuthUser";

const row =
  "flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-[15px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

/**
 * Sidebar row showing who is signed in, with sign out; or a sign-in link.
 * `labelClass` lets the host sidebar hide the text when it is collapsed.
 */
export default function AccountMenu({
  signInHref,
  labelClass = "",
  onNavigate,
}: {
  signInHref: string;
  labelClass?: string;
  onNavigate?: () => void;
}) {
  const { user, loading } = useAuthUser();
  if (loading) return <div className="h-10" aria-hidden />;

  if (!user) {
    return (
      <Link href={signInHref} onClick={onNavigate} className={row}>
        <LogIn className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className={labelClass}>Sign in</span>
      </Link>
    );
  }

  const name = (user.user_metadata?.username as string | undefined) || user.email || "Account";
  return (
    <button type="button" onClick={() => signOut()} title={`Signed in as ${name}`} className={row}>
      <LogOut className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className={`min-w-0 text-left leading-tight ${labelClass}`}>
        <span className="block truncate text-[13px] text-neutral-500">{name}</span>
        <span className="block text-sm font-medium">Sign out</span>
      </span>
    </button>
  );
}
