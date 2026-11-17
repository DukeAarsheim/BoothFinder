"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BrandProfile } from "@/lib/types";
import { useAuthUser } from "@/lib/auth/useAuthUser";
import type { VendorAccount } from "@/lib/vendor/account";

/**
 * Tiny localStorage-backed stores. Saved events and the brand profile live in
 * this browser, kept separately for each signed-in account (the key ends with
 * the account's id), so one account's numbers and saved events never show up
 * in another's. They do not follow an account to another device.
 */
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = fallback;
  if (raw) {
    try {
      value = JSON.parse(raw) as T;
    } catch {}
  }
  cache.set(key, { raw, value });
  return value;
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  listeners.forEach((cb) => cb());
}

/**
 * The storage key for the current account: `base` plus the account id. Null
 * while the stored session is still being checked, so nothing from another
 * account (or a guest) is shown in the meantime. Where sign-in isn't set up at
 * all, there are no accounts and the plain `base` key is used.
 */
function useAccountKey(base: string) {
  const { user, loading } = useAuthUser();
  if (loading) return null;
  return user ? `${base}:${user.id}` : base;
}

function useStored<T>(key: string | null, fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => (key ? read(key, fallback) : fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: T) => {
      if (key) write(key, next);
    },
    [key],
  );
  return [value, set] as const;
}

// ── Saved events ────────────────────────────────────────────────────────────
const NO_IDS: string[] = [];
const SAVED_KEY = "boothfinder.savedEventIds";

export function useSavedEvents() {
  const key = useAccountKey(SAVED_KEY);
  const [ids] = useStored<string[]>(key, NO_IDS);
  const toggle = useCallback(
    (id: string) => {
      if (!key) return;
      // Read the latest value, so quick successive toggles don't overwrite each other.
      const now = read<string[]>(key, NO_IDS);
      write(key, now.includes(id) ? now.filter((x) => x !== id) : [...now, id]);
    },
    [key],
  );
  return { savedIds: ids, isSaved: (id: string) => ids.includes(id), toggle };
}

// ── Brand profile (inputs to the Fit score, MASTER.md §4) ───────────────────
/**
 * Starting values: an example juice brand, using the base case of the projection
 * spec (10% category purchase rate) and the team's market research (≈$7 drink,
 * ≈65% margin). The user replaces them with their own numbers.
 */
export const DEFAULT_BRAND_PROFILE: BrandProfile = {
  price: 7,
  margin: 0.65,
  otherCosts: 250,
  productType: "cold",
};

/**
 * Who this vendor is (company name, contact, ...), filled in on /vendor/setup.
 * `ready` is false until the stored session has been checked, so callers don't
 * mistake "not loaded yet" for "never set up".
 */
export function useVendorAccount() {
  const key = useAccountKey("boothfinder.vendorAccount");
  const [account, save] = useStored<VendorAccount | null>(key, null);
  return { account, save, ready: key !== null };
}

export function useBrandProfile() {
  const key = useAccountKey("boothfinder.brandProfile");
  return useStored<BrandProfile | null>(key, null);
}
