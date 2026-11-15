import type { EventRow } from "@/lib/types";
import { EVENT_TYPE_LABELS, formatBoothFee, formatDate, formatDateRange } from "@/lib/vendor/format";

const usd = (n: number | null) => (n == null ? null : `$${n.toLocaleString("en-US")}`);

/**
 * An event's key details as [label, value] pairs, in plain words. A null value
 * means the listing doesn't say. Pure, so the assistant page (to show them)
 * and the assistant prompt (to tell the AI) share one description.
 */
export function eventFacts(e: EventRow): [label: string, value: string | null][] {
  return [
    ["Type", EVENT_TYPE_LABELS[e.event_type] ?? null],
    ["Dates", formatDateRange(e.start_date, e.end_date)],
    ["Where", [e.venue, e.city, e.county && `${e.county} County`].filter(Boolean).join(", ") || null],
    ["Expected attendance", e.expected_attendance?.toLocaleString("en-US") ?? null],
    ["Booth fee", formatBoothFee(e)],
    ["Share of sales taken", e.fee_pct_of_sales != null ? `${e.fee_pct_of_sales}%` : null],
    ["Booth size", e.booth_size],
    ["Application fee", usd(e.application_fee)],
    ["Electricity fee", usd(e.electricity_fee)],
    ["Vendor spots", e.vendor_spots?.toLocaleString("en-US") ?? null],
    ["Limit on similar vendors", e.similar_vendor_limit],
    ["Application deadline", formatDate(e.application_deadline)],
  ];
}

/** What the assistant page needs about one event: enough to pick it and show it. */
export type AssistantEvent = { id: string; name: string; facts: [string, string | null][] };

export const toAssistantEvent = (e: EventRow): AssistantEvent => ({
  id: e.id,
  name: e.name,
  facts: eventFacts(e),
});
