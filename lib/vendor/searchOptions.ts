/** Search values are explicit: a missing price/cut is never treated as zero. */
export const FEE_FILTERS = [
  ["", "Any booth fee"],
  ["zero", "Free booth ($0)"],
  ["100", "Booth fee up to $100"],
  ["250", "Booth fee up to $250"],
  ["500", "Booth fee up to $500"],
  ["1000", "Booth fee up to $1,000"],
  ["over-1000", "Booth fee over $1,000"],
  ["unknown", "Booth fee not listed"],
] as const;
export const CUT_FILTERS = [
  ["", "Any sales cut"],
  ["zero", "No sales cut (0%)"],
  ["5", "Sales cut up to 5%"],
  ["10", "Sales cut up to 10%"],
  ["15", "Sales cut up to 15%"],
  ["20", "Sales cut up to 20%"],
  ["25", "Sales cut up to 25%"],
  ["over-25", "Sales cut over 25%"],
  ["unknown", "Sales cut not listed"],
] as const;
/** Filters on the estimated (base-case) profit from the Fit Calculator's numbers. */
export const PROFIT_FILTERS = [
  ["", "Any profit"],
  ["positive", "Profitable (above $0)"],
  ["250", "Profit of $250 or more"],
  ["500", "Profit of $500 or more"],
  ["1000", "Profit of $1,000 or more"],
  ["unknown", "No profit estimate"],
] as const;
export const SORT_OPTIONS = [
  ["profit-desc", "Estimated profit: high to low"],
  ["profit-asc", "Estimated profit: low to high"],
  ["date-asc", "Event date: soonest first"],
  ["date-desc", "Event date: latest first"],
  ["size-asc", "Booth size: smallest first"],
  ["size-desc", "Booth size: largest first"],
  ["attendance-desc", "Attendance: high to low"],
  ["attendance-asc", "Attendance: low to high"],
  ["name-asc", "Event name: A–Z"],
  ["name-desc", "Event name: Z–A"],
  ["fee-asc", "Booth fee: low to high"],
  ["fee-desc", "Booth fee: high to low"],
  ["cut-asc", "Sales cut: low to high"],
  ["cut-desc", "Sales cut: high to low"],
  ["deadline-asc", "Application deadline: soonest first"],
  ["deadline-desc", "Application deadline: latest first"],
  ["county-asc", "County: A–Z"],
  ["county-desc", "County: Z–A"],
  ["city-asc", "City: A–Z"],
  ["city-desc", "City: Z–A"],
  ["type-asc", "Event type: A–Z"],
  ["type-desc", "Event type: Z–A"],
] as const;
export type SortBy = (typeof SORT_OPTIONS)[number][0];
type PricedEvent = {
  booth_fee_min: number | null;
  booth_fee_max: number | null;
  fee_pct_of_sales: number | null;
};
type SearchEvent = PricedEvent & {
  id: string;
  name: string;
  start_date: string | null;
  application_deadline: string | null;
  county: string | null;
  city: string | null;
  event_type: string;
  expected_attendance?: number | null;
  booth_size?: string | null;
  timing?: { kind: string; start?: string };
};
export const startingFee = (event: PricedEvent) =>
  event.booth_fee_min ?? event.booth_fee_max;

function matches(value: number | null, filter: string, high: number): boolean {
  if (!filter) return true;
  if (filter === "unknown") return value === null;
  if (value === null) return false;
  if (filter === "zero") return value === 0;
  if (filter === `over-${high}`) return value > high;
  const cap = Number(filter);
  return Number.isFinite(cap) && value <= cap;
}
export const matchesBoothFee = (event: PricedEvent, filter: string) =>
  matches(startingFee(event), filter, 1000);
export const matchesSalesCut = (event: PricedEvent, filter: string) =>
  matches(event.fee_pct_of_sales, filter, 25);

/**
 * profit = the base-case estimate in dollars, or null when the event can't be
 * projected (no attendance or unclear fee terms). A missing estimate never
 * counts as $0: it only matches "No profit estimate".
 */
export function matchesProfit(profit: number | null, filter: string): boolean {
  if (!filter) return true;
  if (filter === "unknown") return profit === null;
  if (profit === null) return false;
  if (filter === "positive") return profit > 0;
  const min = Number(filter);
  return Number.isFinite(min) && profit >= min;
}

const text = (value: string | null) => value?.trim() || null;
const compareText = (a: string, b: string) =>
  a.localeCompare(b, "en", { sensitivity: "base", numeric: true });
/** Unknowns stay last in either direction; input order is never mutated. */
export function sortEvents<T extends SearchEvent>(
  events: readonly T[],
  sort: SortBy,
  /** Base-case estimated profit by event id; only the profit sorts read it. */
  profits?: ReadonlyMap<string, number | null>,
): T[] {
  const descending = sort.endsWith("-desc");
  const field = sort.slice(0, sort.lastIndexOf("-"));
  const value = (event: T): string | number | null => {
    switch (field) {
      case "profit":
        return profits?.get(event.id) ?? null;
      case "name":
        return text(event.name);
      case "size":
        return smallestBoothArea(event.booth_size);
      case "attendance":
        return event.expected_attendance ?? null;
      case "fee":
        return startingFee(event);
      case "cut":
        return event.fee_pct_of_sales;
      case "deadline":
        return event.application_deadline;
      case "county":
        return text(event.county?.replace(/\s+county$/i, "") ?? null);
      case "city":
        return text(event.city);
      case "type":
        return text(event.event_type.replaceAll("_", " "));
      default:
        return event.timing?.start ?? event.start_date;
    }
  };
  return [...events].sort((a, b) => {
    const av = value(a),
      bv = value(b);
    if (av === null && bv !== null) return 1;
    if (bv === null && av !== null) return -1;
    const order =
      av === null || bv === null
        ? 0
        : typeof av === "number" && typeof bv === "number"
          ? av - bv
          : compareText(String(av), String(bv));
    return (
      (descending ? -order : order) ||
      compareText(a.name, b.name) ||
      compareText(a.id, b.id)
    );
  });
}

/** Match listed footprints without inferring a booth size from unrelated notes. */
function listedBoothSizes(
  value: string | null,
): { value: string; label: string }[] {
  const raw = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!raw || /^(not (listed|stated)|unknown|tbd|n\/a)$/i.test(raw)) return [];
  const found = new Map<string, string>();
  const pattern =
    /\b(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|['′’])?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|['′’])?(\+)?(?![\w.])/gi;
  for (const match of raw.matchAll(pattern)) {
    // Keep metric/inch descriptions literal instead of mixing their dimensions
    // with the feet-based footprints used by the event listings.
    const suffix = raw.slice((match.index ?? 0) + match[0].length);
    if (/^\s*(?:(?:m(?:eters?|etres?)?|cm|in(?:ch(?:es)?)?)\b|["″])/i.test(suffix)) continue;
    const dimensions = [Number(match[1]), Number(match[2])].sort(
      (a, b) => a - b,
    );
    if (dimensions.some((dimension) => dimension <= 0)) continue;
    const plus = match[3] ?? "";
    const key = `${dimensions[0]}x${dimensions[1]}${plus}`;
    found.set(key, `${dimensions[0]} × ${dimensions[1]}${plus}`);
  }
  return found.size
    ? [...found].map(([value, label]) => ({ value, label }))
    : [{ value: `text:${raw.toLowerCase()}`, label: raw }];
}
export function boothSizeOptions(
  events: readonly { booth_size: string | null }[],
) {
  const options = new Map<string, string>();
  for (const event of events)
    for (const size of listedBoothSizes(event.booth_size))
      options.set(size.value, size.label);
  return [...options]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => compareText(a.label, b.label));
}
export function matchesBoothSize(
  event: { booth_size: string | null },
  filter: string,
) {
  if (!filter) return true;
  const sizes = listedBoothSizes(event.booth_size);
  return filter === "unknown"
    ? sizes.length === 0
    : sizes.some((size) => size.value === filter);
}
function smallestBoothArea(value: string | null | undefined): number | null {
  const areas = listedBoothSizes(value ?? null).flatMap((size) => {
    const dimensions = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(?:\+)?$/.exec(
      size.value,
    );
    return dimensions ? [Number(dimensions[1]) * Number(dimensions[2])] : [];
  });
  return areas.length ? Math.min(...areas) : null;
}
