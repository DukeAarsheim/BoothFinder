"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BrandProfile } from "@/lib/types";

/**
 * Tiny localStorage-backed stores. There are no accounts (MASTER.md §2), so
 * saved events and the brand profile live in this browser only.
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

function useStored<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback((next: T) => write(key, next), [key]);
  return [value, set] as const;
}

// ── Saved events ────────────────────────────────────────────────────────────
const NO_IDS: string[] = [];
const SAVED_KEY = "boothfinder.savedEventIds";

export function useSavedEvents() {
  const [ids] = useStored<string[]>(SAVED_KEY, NO_IDS);
  const toggle = useCallback((id: string) => {
    // Read the latest value, so quick successive toggles don't overwrite each other.
    const now = read<string[]>(SAVED_KEY, NO_IDS);
    write(SAVED_KEY, now.includes(id) ? now.filter((x) => x !== id) : [...now, id]);
  }, []);
  return { savedIds: ids, isSaved: (id: string) => ids.includes(id), toggle };
}

// ── Brand profile (inputs to the Fit score, MASTER.md §4) ───────────────────
/** Starting values from the worked example in MASTER.md §4. */
export const DEFAULT_BRAND_PROFILE: BrandProfile = {
  price: 8,
  margin: 0.6,
  purchaseRate: 0.04,
  otherCosts: 0,
  productType: "cold",
};

export function useBrandProfile() {
  return useStored<BrandProfile | null>("boothfinder.brandProfile", null);
}
