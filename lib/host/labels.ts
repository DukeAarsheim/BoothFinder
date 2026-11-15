/**
 * The wording the organizer dashboard shows for each state. Kept apart from the
 * components so every branch (closed deadline, missing attendance, full
 * category) is covered by lib/host/labels.test.mjs.
 *
 * Type-only imports on purpose: see metrics.ts.
 */
import type { VendorCategory } from "@/lib/types";
import type { ChecklistItem, MixRow } from "./metrics";

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
  food: "Food",
  drink: "Drink",
  other: "Other",
};

/** How a category reads in the middle of a sentence: "one more drink vendor". */
const CATEGORY_NOUNS: Record<VendorCategory, string> = {
  food: "food",
  drink: "drink",
  other: "non-food",
};

// ---------------------------------------------------------------------------
// Deadline
// ---------------------------------------------------------------------------

export type DeadlineLabel = { value: string; caption: string; urgent: boolean };

/** Deadlines this many days away or closer are shown as urgent. */
const URGENT_WITHIN_DAYS = 14;

/** `days` comes from `daysUntil` in metrics.ts. */
export function deadlineLabel(days: number | null): DeadlineLabel {
  if (days == null) return { value: "—", caption: "no deadline set", urgent: false };
  if (days < 0) return { value: "Closed", caption: "to new applications", urgent: false };
  if (days === 0) return { value: "Today", caption: "last day to apply", urgent: true };
  return {
    value: days === 1 ? "1 day" : `${days} days`,
    caption: "left to apply",
    urgent: days <= URGENT_WITHIN_DAYS,
  };
}

// ---------------------------------------------------------------------------
// Vendor mix
// ---------------------------------------------------------------------------

/**
 * One sentence on what accepting another vendor does to the others' expected
 * sales, for the category where it matters most: a full one first, otherwise
 * the fullest. null when no category with a limit has an accepted vendor.
 */
export function crowdingNote(rows: MixRow[]): string | null {
  const candidates = rows.filter((row) => row.limit > 0 && row.nextVendorDrop != null);
  if (candidates.length === 0) return null;

  const fill = (row: MixRow) => row.accepted / row.limit;
  const [top] = [...candidates].sort(
    (a, b) => Number(b.full) - Number(a.full) || fill(b) - fill(a),
  );
  const noun = CATEGORY_NOUNS[top.category];
  const percent = Math.round((top.nextVendorDrop ?? 0) * 100);

  if (top.full) {
    return `${CATEGORY_LABELS[top.category]} is full at ${top.limit}. Accepting one more ${noun} vendor would cut each ${noun} vendor's expected sales by about ${percent}%.`;
  }
  return `Each ${noun} vendor you add lowers what the others can expect to sell. Going from ${top.accepted} to ${top.accepted + 1} would cut each one's expected sales by about ${percent}%.`;
}

// ---------------------------------------------------------------------------
// Listing completeness
// ---------------------------------------------------------------------------

export type CompletenessNote = { tone: "info" | "warning"; title: string; body: string };

/** "a and b", or "a, b, and c". */
const listWords = (words: string[]) =>
  words.length <= 2
    ? words.join(" and ")
    : `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;

/** What the checklist means for the organizer. `items` comes from `listingChecklist`. */
export function completenessNote(items: ChecklistItem[]): CompletenessNote {
  const missing = items.filter((item) => !item.done);

  if (missing.length === 0) {
    return {
      tone: "info",
      title: "Your listing is complete",
      body: "Vendors see scores based on your own numbers, not estimates.",
    };
  }
  if (missing.some((item) => item.key === "attendance")) {
    return {
      tone: "warning",
      title: 'Vendors see "Estimated" scores for this event',
      body: "Expected attendance is missing, so scores are estimated from similar events. Adding it makes your scores more accurate and improves your ranking.",
    };
  }
  return {
    tone: "info",
    title: missing.length === 1 ? "1 detail to add" : `${missing.length} details to add`,
    body: `Add the ${listWords(missing.map((item) => item.label.toLowerCase()))} to make vendors' scores more accurate and improve your ranking.`,
  };
}

// ---------------------------------------------------------------------------
// Fee per attendee
// ---------------------------------------------------------------------------

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dollarsAndCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * "Your $350 booth fee is $0.03 per attendee. The San Luis Obispo County median
 * is $0.04." Falls back to asking for whichever number is missing.
 * `perAttendee` comes from `feePerAttendee` in metrics.ts.
 */
export function feeComparison({
  fee,
  perAttendee,
  countyMedian,
  county,
}: {
  fee: number | null;
  perAttendee: number | null;
  countyMedian: number | null;
  county: string | null;
}): string {
  if (fee == null) return "Add a booth fee to see your fee per attendee.";
  if (perAttendee == null) return "Add expected attendance to see your fee per attendee.";

  // Half a cent and under would round to "$0.00", which reads as free.
  const each = perAttendee < 0.005 ? "less than $0.01" : dollarsAndCents.format(perAttendee);
  const yours = `Your ${wholeDollars.format(fee)} booth fee is ${each} per attendee.`;
  if (countyMedian == null) return yours;

  const where = county ? `${county} County` : "county";
  return `${yours} The ${where} median is ${dollarsAndCents.format(countyMedian)}.`;
}
