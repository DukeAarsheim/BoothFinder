type EventDates = { start_date: string | null; end_date: string | null };

const dayOf = (iso: string) => iso.slice(0, 10);

/**
 * True when the event runs on at least one day between `from` and `to`
 * (both "YYYY-MM-DD", inclusive). Either end may be blank for an open range;
 * with both blank every event passes. A multi-day event counts if any of its
 * days falls in the range. An event with no start date can't be placed in
 * time, so it is left out as soon as a range is set.
 */
export function inDateRange(event: EventDates, from: string, to: string) {
  if (!from && !to) return true;
  if (!event.start_date) return false;
  // Picking the dates in the wrong order still means the same range.
  const [lo, hi] = from && to && from > to ? [to, from] : [from, to];
  const start = dayOf(event.start_date);
  const end = event.end_date ? dayOf(event.end_date) : start;
  return (!lo || end >= lo) && (!hi || start <= hi);
}
