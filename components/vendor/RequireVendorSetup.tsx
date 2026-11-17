"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasSkippedSetup, setSkippedSetup } from "@/lib/vendor/setupSkip";
import { useVendorAccount } from "@/lib/vendor/storage";

export const SETUP_PATH = "/vendor/setup";

/**
 * Sends a vendor who hasn't set up their account yet to /vendor/setup, so the
 * first thing a new vendor sees is the setup page, not a map of profit
 * estimates for numbers they haven't entered. That redirect happens once per
 * browser session (lib/vendor/setupSkip.ts): after it, the sidebar and the "Skip
 * for now" link open the other pages, with no profit numbers until the vendor
 * saves theirs. Used in app/vendor/layout.tsx, inside the sign-in check.
 */
export default function RequireVendorSetup({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { account, ready } = useVendorAccount();

  const needsSetup = ready && !account && pathname !== SETUP_PATH && !hasSkippedSetup();
  useEffect(() => {
    if (needsSetup) {
      // Setup opens first, once per session. After that the sidebar works:
      // Explore Events and the other pages open without it.
      setSkippedSetup(true);
      router.replace(SETUP_PATH);
    }
  }, [needsSetup, router]);

  if (!ready || needsSetup) {
    return <p className="p-6 text-neutral-500">Loading your account…</p>;
  }
  return children;
}
