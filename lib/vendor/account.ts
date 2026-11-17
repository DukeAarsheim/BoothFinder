/**
 * What a vendor tells us about their business when they set up their account.
 * Pure types and checks, no imports, so the tests can load this file with plain
 * Node (node --test "lib/vendor/*.test.mjs").
 *
 * The numbers that drive the profit estimates (price, margin, costs, what is
 * sold) are the BrandProfile in lib/types.ts. This is the rest: who the vendor
 * is. Both are saved in this browser, separately for each account
 * (lib/vendor/storage.ts).
 */
export const OFFERINGS = [
  { value: "drinks", label: "Drinks" },
  { value: "food", label: "Food" },
  { value: "both", label: "Food and drinks" },
] as const;

export type Offering = (typeof OFFERINGS)[number]["value"];

export type VendorAccount = {
  companyName: string;
  contactName: string;
  email: string;
  /** Optional. */
  phone: string;
  /** Optional. */
  website: string;
  /** City or town the business operates from. Optional. */
  baseCity: string;
  offering: Offering;
  /** A line or two about what the business sells. Optional. */
  description: string;
  /** When setup was finished (ISO date). */
  completedAt: string;
};

/** A deliberately loose check: something@something.something, no spaces. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Tidy a website the vendor typed: trims it, and adds https:// when they left
 * the scheme off. Empty stays empty. Returns null when it isn't a usable web
 * address.
 */
export function normalizeWebsite(value: string): string | null {
  const text = value.trim();
  if (!text) return "";
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes(".") ? withScheme : null;
  } catch {
    return null;
  }
}
