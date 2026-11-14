import type { EventRow } from "@/lib/types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const parse = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const day = (iso: string, withYear = true) =>
  parse(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });

/** "Jun 5, 2027", "Jun 5 – Jun 7, 2027", or null when the source gave no date. */
export function formatDateRange(start: string | null, end: string | null) {
  if (!start) return null;
  if (!end || end === start) return day(start);
  return `${day(start, start.slice(0, 4) !== end.slice(0, 4))} – ${day(end)}`;
}

export const formatDate = (iso: string | null) => (iso ? day(iso) : null);

/** Booth fee as "$150", "$150–$400", or null when the source didn't list one. */
export function formatBoothFee(e: Pick<EventRow, "booth_fee_min" | "booth_fee_max">) {
  const lo = e.booth_fee_min ?? e.booth_fee_max;
  const hi = e.booth_fee_max ?? e.booth_fee_min;
  if (lo == null || hi == null) return null;
  return lo === hi ? usd.format(lo) : `${usd.format(lo)}–${usd.format(hi)}`;
}

export function formatLocation(e: Pick<EventRow, "city" | "county">) {
  const county =
    e.county && !/county$/i.test(e.county) ? `${e.county} County` : e.county;
  return [e.city, county].filter(Boolean).join(", ") || null;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  fair: "Fair",
  race: "Race",
  market: "Market",
  festival: "Festival",
  street_fair: "Street fair",
  other: "Other",
};
