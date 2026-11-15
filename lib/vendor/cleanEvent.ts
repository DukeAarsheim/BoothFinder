import type { EventRow } from "@/lib/types";

/**
 * Cleans up events that were bulk-imported from the research spreadsheet
 * (events_seed.csv). That import kept anything it wasn't sure of as text: the
 * schedule sits in `schedule_notes` as "Next schedule: … Previous/recurring
 * schedule: …", the venue sits in brackets after the city, and `notes` holds
 * the import's own bookkeeping. This module turns that text back into the
 * fields the app sorts, filters and shows.
 *
 * Nothing is made up. A date is only filled in when the organizer's next date
 * is written out. When only last year's dates are known, the event gets an
 * "expected" window (same days, next year) that is always labelled as such.
 *
 * It runs when events are loaded, so the stored rows are left as they are.
 * Events added by the finder or typed in on the Add event page don't match the
 * import's format and pass through unchanged.
 */

/** When an event happens, as far as the listing can say. */
export type EventTiming =
  /** The organizer's dates are known. */
  | { kind: "dated"; start: string; end: string }
  /** Next dates aren't posted; this window repeats the last known ones. */
  | { kind: "expected"; start: string; end: string; basedOn: string }
  /** Runs every week (a farmers market), so it has no single date. */
  | { kind: "recurring" }
  | { kind: "unknown" };

export type ListedEvent = EventRow & { timing?: EventTiming };

const IMPORT_NOTE = "Imported from user-supplied";
const NEXT_LABEL = "Next schedule: ";
const PREVIOUS_LABEL = ". Previous/recurring schedule: ";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_NAME = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const ISO = /\b\d{4}-\d{2}-\d{2}\b/g;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const utc = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const lastDayOf = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function human(day: string, withYear = true) {
  return utc(day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

const humanRange = (start: string, end: string) =>
  start === end
    ? human(start)
    : `${human(start, start.slice(0, 4) !== end.slice(0, 4))} – ${human(end)}`;

/** "2026-07-30 to 2026-08-02" → "Jul 30 – Aug 2, 2026"; lone dates → "Jul 30, 2026". */
function humanize(text: string) {
  return text
    .replace(/\b(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})\b/g, (_, a, b) => humanRange(a, b))
    .replace(ISO, (day) => human(day));
}

const sentence = (text: string) => {
  const t = text.trim().replace(/\.+$/, "");
  return t ? `${t}.` : "";
};

/** The first and last day a piece of schedule text names, if it names any. */
function windowIn(text: string): { start: string; end: string; exact: boolean } | null {
  const days = text.match(ISO);
  if (days) {
    const sorted = [...days].sort();
    return { start: sorted[0], end: sorted[sorted.length - 1], exact: true };
  }
  const year = Number(/\b(20\d{2})\b/.exec(text)?.[1]);
  if (!year) return null;

  // "Jun 20-21 through Sep 26-27"
  const found: string[] = [];
  for (const m of text.matchAll(new RegExp(`\\b${MONTH_NAME} (\\d{1,2})(?:-(\\d{1,2}))?\\b`, "gi"))) {
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    for (const d of [m[2], m[3]]) {
      if (d && Number(d) >= 1 && Number(d) <= lastDayOf(year, month)) found.push(iso(year, month, Number(d)));
    }
  }
  if (found.length) {
    found.sort();
    return { start: found[0], end: found[found.length - 1], exact: false };
  }

  // "April 2027", "2026 July": the whole month.
  const months = [...text.matchAll(new RegExp(`\\b${MONTH_NAME}(?![a-z])`, "gi"))]
    .map((m) => MONTHS.indexOf(m[1].toLowerCase()) + 1)
    .sort((a, b) => a - b);
  if (!months.length) return null;
  const last = months[months.length - 1];
  return { start: iso(year, months[0], 1), end: iso(year, last, lastDayOf(year, last)), exact: false };
}

/** Moves a window forward a year at a time until it hasn't already passed. */
function nextOccurrence(start: string, end: string, today: string) {
  let years = 0;
  const shift = (day: string) => {
    const [y, m, d] = day.split("-").map(Number);
    return iso(y + years, m, Math.min(d, lastDayOf(y + years, m)));
  };
  while (shift(end) < today && years < 5) years++;
  return { start: shift(start), end: shift(end) };
}

const isWeekly = (text: string) =>
  /\b(weekly|year-round|(mon|tues|wednes|thurs|fri|satur|sun)days)\b/i.test(text);
/** Null for text that only says nothing was found ("Not stated", "2026 fair held (dates not read)"). */
const says = (text: string | null) =>
  text && !/^not (stated|read)\b/i.test(text) && !/\bheld \((exact )?dates? not read\)$/i.test(text) ? text : null;

function dayType(start: string, end: string): EventRow["day_type"] {
  let weekday = false;
  let weekend = false;
  const first = utc(start).getTime();
  const days = Math.min(7, Math.round((utc(end).getTime() - first) / 86_400_000) + 1);
  for (let i = 0; i < days; i++) {
    const d = new Date(first + i * 86_400_000).getUTCDay();
    if (d === 0 || d === 6) weekend = true;
    else weekday = true;
  }
  return weekday && weekend ? "mixed" : weekend ? "weekend" : "weekday";
}

function cleanSchedule(row: EventRow, today: string) {
  const text = row.schedule_notes ?? "";
  const cut = text.lastIndexOf(PREVIOUS_LABEL);
  const next = text.slice(NEXT_LABEL.length, cut).trim();
  const previous = says(text.slice(cut + PREVIOUS_LABEL.length).trim().replace(/\.$/, ""));

  let { start_date, end_date } = row;
  let timing: EventTiming = { kind: "unknown" };
  const nextWindow = windowIn(next);
  const previousWindow = previous ? windowIn(previous) : null;

  // "2027-07-04 expected (annual; not posted)" is a good guess, not a posted date.
  const confirmed = nextWindow?.exact && !/\bexpected\b/i.test(next);
  if (!start_date && confirmed) {
    start_date = nextWindow.start;
    end_date = nextWindow.end === nextWindow.start ? null : nextWindow.end;
  }
  if (start_date) {
    timing = { kind: "dated", start: start_date.slice(0, 10), end: (end_date ?? start_date).slice(0, 10) };
  } else if (/^recurring\b/i.test(next) || (previous && !previousWindow?.exact && isWeekly(previous))) {
    timing = { kind: "recurring" };
  } else if (nextWindow) {
    timing = {
      kind: "expected",
      start: nextWindow.start,
      end: nextWindow.end,
      basedOn: previousWindow?.exact
        ? humanRange(previousWindow.start, previousWindow.end)
        : humanize(next).replace(/\s*\(.*\)$/, ""),
    };
  } else if (previousWindow) {
    timing = {
      kind: "expected",
      ...nextOccurrence(previousWindow.start, previousWindow.end, today),
      basedOn: previousWindow.exact
        ? humanRange(previousWindow.start, previousWindow.end)
        : humanize(previous!).replace(/\s*\(.*\)$/, ""),
    };
  }

  // Readable schedule text, without the import's labels.
  const parts: string[] = [];
  const notPosted = /^(\d{4}(?: and \d{4})?) (?:dates )?not (posted|found|read)\b(.*)$/i.exec(next);
  const status = { posted: "not posted yet", found: "not found", read: "not confirmed" };
  const sameAsDates =
    previousWindow?.exact &&
    timing.kind === "dated" &&
    previousWindow.start === timing.start &&
    previousWindow.end === timing.end;
  if (timing.kind === "recurring") {
    if (previous) parts.push(sentence(humanize(previous)));
    if (!/^recurring\b/i.test(next)) parts.push(sentence(humanize(next)));
  } else {
    if (notPosted) {
      const verb = status[notPosted[2].toLowerCase() as keyof typeof status];
      parts.push(sentence(`${notPosted[1]} dates ${verb}${notPosted[3]}`));
    }
    else {
      const plain = next.replace(/\s*\((organizer|organizer page)\)/gi, "");
      // A bare date range adds nothing once the dates themselves are filled in.
      const bare = !plain.replace(ISO, "").replace(/\bto\b/g, "").trim();
      if (!(bare && timing.kind === "dated")) {
        parts.push(sentence(`${sameAsDates ? "After that" : "Next"}: ${humanize(plain)}`));
      }
    }
    if (previous && !sameAsDates) parts.push(sentence(`Last held: ${humanize(previous)}`));
  }

  return {
    start_date,
    end_date,
    schedule_notes: parts.join(" ") || null,
    day_type: row.day_type ?? (timing.kind === "dated" ? dayType(timing.start, timing.end) : null),
    timing,
  };
}

function cleanHowToApply(text: string) {
  const m =
    /^Application status \(checked (\d{4}-\d{2}-\d{2})\): ([\s\S]*?)\. Deadline details: ([\s\S]*?)\. Confirm current availability[\s\S]*$/.exec(
      text,
    );
  if (!m) return text;
  return `Status as of ${human(m[1])}: ${humanize(m[2])}. Deadline: ${humanize(m[3])}.`;
}

/** Lines of the import's notes worth showing a vendor; its bookkeeping is dropped. */
function cleanNotes(text: string) {
  const field = (label: string) => {
    const line = text.split("\n").find((l) => l.startsWith(`${label}: `));
    return line ? line.slice(label.length + 2).trim() : null;
  };
  const parts: string[] = [];
  const electricity = field("Electricity terms");
  if (electricity && !/^not stated\.?$/i.test(electricity)) parts.push(sentence(`Electricity: ${electricity}`));
  const rules = field("Food/drink rules");
  if (rules && !/^[\w\s/-]*\bnot (stated|listed)\.*$/i.test(rules)) parts.push(sentence(`Food and drink rules: ${rules}`));
  const exclusivity = field("Beverage exclusivity");
  if (exclusivity && !/^not stated( on the pages read)?\.?$/i.test(exclusivity)) {
    parts.push(sentence(`Drink exclusivity: ${exclusivity}`));
  }
  if (/^Map location: approximate/m.test(text)) parts.push("Map pin shows the city center, not the exact venue.");
  return parts.join(" ") || null;
}

/** "10x10 $350; 10x20 $700" → "10×10, 10×20". Null when the fee text names no size, or too many. */
function boothSizes(feeNotes: string | null) {
  const sizes = new Set<string>();
  for (const m of (feeNotes ?? "").matchAll(/\b(\d{1,2}) ?x ?(\d{1,2})\b/gi)) sizes.add(`${m[1]}×${m[2]}`);
  return sizes.size >= 1 && sizes.size <= 4 ? [...sizes].join(", ") : null;
}

const PRICING_CAVEAT =
  "Pricing needs vendor-category or billing-period confirmation before a profit projection can use it. ";

/** True for a row in the spreadsheet import's format. */
export function isImportedRow(row: Pick<EventRow, "schedule_notes" | "notes">) {
  return Boolean(
    row.notes?.startsWith(IMPORT_NOTE) ||
      (row.schedule_notes?.startsWith(NEXT_LABEL) && row.schedule_notes.includes(PREVIOUS_LABEL)),
  );
}

/**
 * Returns the event with its imported text turned into proper fields, plus
 * `timing`. `today` is "YYYY-MM-DD". Safe to run on any event, and on an event
 * that was already cleaned.
 */
export function cleanEvent(row: EventRow, today: string): ListedEvent {
  if (!isImportedRow(row)) {
    return {
      ...row,
      timing: row.start_date
        ? { kind: "dated", start: row.start_date.slice(0, 10), end: (row.end_date ?? row.start_date).slice(0, 10) }
        : { kind: "unknown" },
    };
  }

  const event: ListedEvent = { ...row };

  if (row.schedule_notes?.startsWith(NEXT_LABEL) && row.schedule_notes.includes(PREVIOUS_LABEL)) {
    Object.assign(event, cleanSchedule(row, today));
  } else if (row.start_date) {
    event.timing = { kind: "dated", start: row.start_date.slice(0, 10), end: (row.end_date ?? row.start_date).slice(0, 10) };
  } else {
    event.timing = { kind: "unknown" };
  }

  // "San Diego (Liberty Station)" → city San Diego, venue Liberty Station.
  const place = /^(.+?)\s*\((.+)\)$/.exec(row.city ?? "");
  if (place) {
    event.city = place[1].replace(/\s+area$/i, "");
    event.venue = row.venue ?? place[2];
  }

  if (row.how_to_apply) event.how_to_apply = cleanHowToApply(row.how_to_apply);
  if (row.notes?.startsWith(IMPORT_NOTE)) event.notes = cleanNotes(row.notes);
  if (row.fee_notes?.startsWith(PRICING_CAVEAT)) {
    event.fee_notes = `Fees depend on vendor type or billing period. ${row.fee_notes.slice(PRICING_CAVEAT.length)}`;
  }
  event.booth_size = row.booth_size ?? boothSizes(row.fee_notes);
  if (row.attendance_source?.startsWith("User-supplied research CSV")) {
    event.attendance_source = "Team research from the event's public pages";
  }
  return event;
}

const timingOf = (event: ListedEvent): EventTiming =>
  event.timing ??
  (event.start_date
    ? { kind: "dated", start: event.start_date.slice(0, 10), end: (event.end_date ?? event.start_date).slice(0, 10) }
    : { kind: "unknown" });

/**
 * Soonest first: events with a date or an expected window that hasn't passed,
 * then weekly markets, then events with no known date, then past events
 * (most recent first). Ties go by name.
 */
export function sortByDate<T extends ListedEvent>(events: T[], today: string): T[] {
  const rank = (event: T): [group: number, key: string] => {
    const timing = timingOf(event);
    if (timing.kind === "recurring") return [1, ""];
    if (timing.kind === "unknown") return [2, ""];
    return timing.end >= today ? [0, timing.start] : [3, timing.start];
  };
  return [...events].sort((a, b) => {
    const [groupA, keyA] = rank(a);
    const [groupB, keyB] = rank(b);
    return (
      groupA - groupB ||
      (groupA === 3 ? keyB.localeCompare(keyA) : keyA.localeCompare(keyB)) ||
      a.name.localeCompare(b.name)
    );
  });
}

/**
 * Whether the event falls between `from` and `to` ("YYYY-MM-DD", inclusive;
 * either may be blank). Expected windows count, weekly markets always match,
 * and an event with no known timing is left out once a range is set.
 */
export function inTimingRange(event: ListedEvent, from: string, to: string) {
  if (!from && !to) return true;
  const timing = timingOf(event);
  if (timing.kind === "recurring") return true;
  if (timing.kind === "unknown") return false;
  const [lo, hi] = from && to && from > to ? [to, from] : [from, to];
  return (!lo || timing.end >= lo) && (!hi || timing.start <= hi);
}

/**
 * The compact date block beside an event: month, day and weekday for a dated
 * event; month, "est." and the year for an expected one. Null when there is no
 * date to show (see dateBlockLabel).
 */
export function dateBlock(event: ListedEvent): { month: string; day: string; weekday: string } | null {
  const timing = timingOf(event);
  if (timing.kind === "recurring" || timing.kind === "unknown") return null;
  const d = utc(timing.start);
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", { ...o, timeZone: "UTC" });
  const month = part({ month: "short" }).toUpperCase();
  return timing.kind === "dated"
    ? { month, day: part({ day: "numeric" }), weekday: part({ weekday: "short" }) }
    : { month, day: "est.", weekday: part({ year: "numeric" }) };
}

/** The event's dates, or "Expected …" for an unconfirmed window. Null when it has neither. */
export function datesLine(event: ListedEvent): string | null {
  const timing = timingOf(event);
  if (timing.kind === "dated") return humanRange(timing.start, timing.end);
  if (timing.kind === "expected") {
    return `Expected ${humanRange(timing.start, timing.end)} (not confirmed)`;
  }
  return null;
}

/** One line on when the event is: its dates, "Expected …", or its schedule text. */
export const whenLine = (event: ListedEvent) => datesLine(event) ?? event.schedule_notes;

/** What the date block says when there is no date: "WEEKLY" for a market, else "TBD". */
export const dateBlockLabel = (event: ListedEvent) => (timingOf(event).kind === "recurring" ? "WEEKLY" : "TBD");
