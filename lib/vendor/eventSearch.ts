import type { EventRow } from "@/lib/types";
import { EVENT_TYPE_LABELS, formatBoothFee, formatDate, formatDateRange } from "@/lib/vendor/format";

/**
 * Everything about an event that a search should be able to find, as one
 * lower-case string: name, place, type, dates (with month names), fees,
 * deadline, booth size and how to apply. Pure, so every search box in the app
 * (vendor and organizer sides) matches the same details.
 */
export function eventSearchText(e: EventRow): string {
  const long = (iso: string | null) =>
    iso
      ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
      : null;
  return [
    e.name,
    e.venue,
    e.city,
    e.county && `${e.county} county`,
    EVENT_TYPE_LABELS[e.event_type],
    formatDateRange(e.start_date, e.end_date),
    long(e.start_date),
    long(e.end_date),
    formatBoothFee(e),
    e.fee_pct_of_sales != null && `${e.fee_pct_of_sales}%`,
    e.application_deadline && `deadline ${formatDate(e.application_deadline)} ${long(e.application_deadline)}`,
    e.expected_attendance != null &&
      `${e.expected_attendance} ${e.expected_attendance.toLocaleString("en-US")} attendance`,
    e.booth_size,
    e.how_to_apply,
    e.similar_vendor_limit,
    e.schedule_notes,
    e.fee_notes,
  ]
    .filter(Boolean)
    .join(" · ")
    .toLowerCase();
}

/**
 * True when every word of the query appears somewhere in the event's details,
 * so "paso october" finds an October event in Paso Robles. An empty query
 * matches everything.
 */
export function matchesEventQuery(e: EventRow, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = eventSearchText(e);
  return words.every((word) => text.includes(word));
}

/**
 * Filter a list by a search. If the exact phrase appears in any event
 * ("10 x 20", "santa barbara"), only those events are returned; otherwise an
 * event matches when every word appears somewhere in its details.
 */
export function searchEvents<T extends EventRow>(events: T[], query: string): T[] {
  const phrase = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!phrase) return events;
  const exact = events.filter((e) => eventSearchText(e).includes(phrase));
  return exact.length > 0 ? exact : events.filter((e) => matchesEventQuery(e, phrase));
}
