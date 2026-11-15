import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEvent, dateBlock, dateBlockLabel, inTimingRange, isImportedRow, sortByDate, whenLine } from "./cleanEvent.ts";

const TODAY = "2026-11-14";

// Rows shaped like the spreadsheet import. Made up for the tests; not event data.
const blank = {
  id: "x", name: "Fair", event_type: "fair", start_date: null, end_date: null, day_type: null,
  schedule_notes: null, venue: null, city: "Town", county: "Kern", how_to_apply: null,
  application_deadline: null, booth_fee_min: null, booth_fee_max: null, fee_notes: null,
  booth_size: null, attendance_source: null, notes: null, created_via: "manual",
};
const imported = (over) => ({
  ...blank,
  notes: "Imported from user-supplied events_seed.csv; approved by the user.",
  ...over,
});
const schedule = (next, previous) => `Next schedule: ${next}. Previous/recurring schedule: ${previous}.`;
const clean = (over) => cleanEvent(imported(over), TODAY);

test("events not from the import pass through unchanged", () => {
  const finder = { ...blank, created_via: "extractor", start_date: "2027-09-24", end_date: "2027-09-26", city: "Monterey (downtown)", notes: "Health permit required." };
  assert.equal(isImportedRow(finder), false);
  const { timing, ...rest } = cleanEvent(finder, TODAY);
  assert.deepEqual(rest, finder);
  assert.deepEqual(timing, { kind: "dated", start: "2027-09-24", end: "2027-09-26" });
});

test("a posted next date fills in the start, end and day type", () => {
  const e = clean({ schedule_notes: schedule("2027-01-15 to 2027-01-17 (year inferred from weekday)", "Not stated") });
  assert.equal(e.start_date, "2027-01-15");
  assert.equal(e.end_date, "2027-01-17");
  assert.equal(e.day_type, "mixed");
  assert.equal(e.schedule_notes, "Next: Jan 15 – Jan 17, 2027 (year inferred from weekday).");
  assert.deepEqual(e.timing, { kind: "dated", start: "2027-01-15", end: "2027-01-17" });
});

test("a bare date range leaves no leftover schedule text", () => {
  const e = clean({ schedule_notes: schedule("2027-06-05 to 2027-06-06 (organizer)", "Not stated") });
  assert.equal(e.start_date, "2027-06-05");
  assert.equal(e.schedule_notes, null);
  assert.equal(e.day_type, "weekend");
});

test("last year's dates never become the event's dates: they give a labelled expected window", () => {
  const e = clean({ schedule_notes: schedule("2027 not posted", "2026-07-30 to 2026-08-02") });
  assert.equal(e.start_date, null);
  assert.equal(e.end_date, null);
  assert.deepEqual(e.timing, { kind: "expected", start: "2027-07-30", end: "2027-08-02", basedOn: "Jul 30 – Aug 2, 2026" });
  assert.equal(e.schedule_notes, "2027 dates not posted yet. Last held: Jul 30 – Aug 2, 2026.");
  assert.equal(whenLine(e), "Expected Jul 30 – Aug 2, 2027 (not confirmed)");
  assert.deepEqual(dateBlock(e), { month: "JUL", day: "est.", weekday: "2027" });
});

test("an expected window is moved forward until it hasn't passed", () => {
  const e = clean({ schedule_notes: schedule("2026 and 2027 not found", "2025-09-17 to 2025-09-28") });
  assert.deepEqual(e.timing, { kind: "expected", start: "2027-09-17", end: "2027-09-28", basedOn: "Sep 17 – Sep 28, 2025" });
  // Still to come this year: not moved.
  const soon = clean({ schedule_notes: schedule("2027 not posted", "Mid-December 2026 (page lists Dec 12-13 and Dec 13-14)") });
  assert.equal(soon.timing.start, "2026-12-12");
  assert.equal(soon.timing.end, "2026-12-14");
});

test("a date the source only calls expected stays expected", () => {
  const e = clean({ schedule_notes: schedule("2027-07-04 expected (annual; not posted)", "2026-07-04") });
  assert.equal(e.start_date, null);
  assert.deepEqual(e.timing, { kind: "expected", start: "2027-07-04", end: "2027-07-04", basedOn: "Jul 4, 2026" });
});

test("month-only schedules give a whole-month window", () => {
  const e = clean({ schedule_notes: schedule("April 2027 (day not posted)", "2026 edition held (date not read)") });
  assert.deepEqual(e.timing, { kind: "expected", start: "2027-04-01", end: "2027-04-30", basedOn: "April 2027" });
  const fair = clean({ schedule_notes: schedule("2027 not posted", "2026 July (5 days)") });
  assert.equal(fair.timing.start, "2027-07-01");
  assert.equal(fair.timing.end, "2027-07-31");
});

test("weekly markets are recurring, with their schedule as plain text", () => {
  const e = clean({ schedule_notes: schedule("Recurring weekly; season dates not stated", "Weekly on Wednesdays (sales until 8 pm)") });
  assert.deepEqual(e.timing, { kind: "recurring" });
  assert.equal(e.schedule_notes, "Weekly on Wednesdays (sales until 8 pm).");
  assert.equal(dateBlock(e), null);
  assert.equal(dateBlockLabel(e), "WEEKLY");
  // A market season with real dates is a window, not "every week forever".
  const season = clean({ schedule_notes: schedule("2027 not posted", "2026-04-15 to 2026-10-21 (28 Wednesday markets 3-7 pm)") });
  assert.equal(season.timing.kind, "expected");
});

test("nothing known about the dates stays unknown", () => {
  const e = clean({ schedule_notes: schedule("2027 dates not read", "2026 fair held (dates not read)") });
  assert.deepEqual(e.timing, { kind: "unknown" });
  assert.equal(e.schedule_notes, "2027 dates not confirmed.");
  assert.equal(dateBlockLabel(e), "TBD");
});

test("dates the import already set are kept", () => {
  const e = clean({ start_date: "2026-11-27", end_date: "2026-11-28", schedule_notes: schedule("2027 expected late November (annual; not posted)", "2026-11-27 to 2026-11-28") });
  assert.equal(e.start_date, "2026-11-27");
  assert.equal(e.schedule_notes, "After that: 2027 expected late November (annual; not posted).");
});

test("a venue in brackets after the city becomes the venue", () => {
  const e = clean({ city: "San Diego (Liberty Station)" });
  assert.equal(e.city, "San Diego");
  assert.equal(e.venue, "Liberty Station");
  assert.equal(clean({ city: "Los Angeles area (Watts; Echo Park)" }).city, "Los Angeles");
  assert.equal(clean({ city: "San Diego (Pier)", venue: "Broadway Pier" }).venue, "Broadway Pier");
});

test("how to apply loses the import's boilerplate", () => {
  const e = clean({
    how_to_apply:
      "Application status (checked 2026-11-14): 2027 not posted. Deadline details: 2026 cycle: 2026-03-03 (wait list until 2026-05-01). Confirm current availability and terms with the organizer using the application link.",
  });
  assert.equal(e.how_to_apply, "Status as of Nov 14, 2026: 2027 not posted. Deadline: 2026 cycle: Mar 3, 2026 (wait list until May 1, 2026).");
});

test("notes keep what a vendor needs and drop the import's bookkeeping", () => {
  const notes = [
    "Imported from user-supplied events_seed.csv; approved by the user.",
    "CSV event ID: some-fair. Research checked: 2026-11-14.",
    "Application status (as researched): 2027 not posted.",
    "Electricity terms: One 110V/500W outlet included.",
    "Food/drink rules: Beverage rules not stated.",
    "Beverage exclusivity: Not stated on the pages read.",
    "Sources: https://example.com/a; https://example.com/b",
    "Import review: electricity_fee: retained as text",
    "Map location: approximate city center from OpenStreetMap/Nominatim, not a confirmed venue.",
  ].join("\n");
  assert.equal(
    clean({ notes }).notes,
    "Electricity: One 110V/500W outlet included. Map pin shows the city center, not the exact venue.",
  );
  const stated = notes
    .replace("Beverage rules not stated.", "Alcohol not permitted.")
    .replace("Not stated on the pages read.", "No: the fair grants no exclusive rights.");
  assert.match(clean({ notes: stated }).notes, /Food and drink rules: Alcohol not permitted\. Drink exclusivity: No: the fair grants no exclusive rights\./);
  assert.equal(clean({}).notes, null);
});

test("booth sizes are read from the fee text, and the internal pricing caveat is reworded", () => {
  assert.equal(clean({ fee_notes: "10x10 $350; 10x15 $525; 10x20 $700." }).booth_size, "10×10, 10×15, 10×20");
  assert.equal(clean({ fee_notes: "Stall $50 a week." }).booth_size, null);
  assert.equal(clean({ fee_notes: "10x10 $350.", booth_size: "12 x 12 ft" }).booth_size, "12 x 12 ft");
  const e = clean({ fee_notes: "Pricing needs vendor-category or billing-period confirmation before a profit projection can use it. Food vendors 12% of gross sales." });
  assert.equal(e.fee_notes, "Fees depend on vendor type or billing period. Food vendors 12% of gross sales.");
});

test("cleaning an already clean event changes nothing", () => {
  const once = clean({
    city: "San Diego (Ocean Beach)",
    schedule_notes: schedule("2027 not posted", "2026-05-07 to 2026-05-10"),
    fee_notes: "10x10 $300.",
  });
  const again = cleanEvent(once, TODAY);
  assert.deepEqual({ ...again, timing: null }, { ...once, timing: null });
});

test("sorting: upcoming by date, then weekly, then undated, then past", () => {
  const named = (name, over) => ({ ...clean(over), name });
  const events = [
    named("Past", { start_date: "2026-05-01" }),
    named("Undated", {}),
    named("Weekly", { schedule_notes: schedule("Recurring weekly", "Weekly on Thursdays") }),
    named("Expected July", { schedule_notes: schedule("2027 not posted", "2026-07-23 to 2026-07-26") }),
    named("Dated June", { start_date: "2027-06-05" }),
    named("Dated July", { start_date: "2027-07-23" }),
  ];
  assert.deepEqual(
    sortByDate(events, TODAY).map((e) => e.name),
    ["Dated June", "Dated July", "Expected July", "Weekly", "Undated", "Past"],
  );
});

test("date range: expected windows count, weekly always matches, undated never does", () => {
  const expected = clean({ schedule_notes: schedule("2027 not posted", "2026-07-30 to 2026-08-02") });
  const weekly = clean({ schedule_notes: schedule("Recurring weekly", "Weekly on Thursdays") });
  const undated = clean({});
  const dated = clean({ start_date: "2027-06-05", end_date: "2027-06-06" });
  for (const e of [expected, weekly, undated, dated]) assert.equal(inTimingRange(e, "", ""), true);
  assert.equal(inTimingRange(expected, "2027-08-01", "2027-08-31"), true);
  assert.equal(inTimingRange(expected, "2027-06-01", "2027-06-30"), false);
  assert.equal(inTimingRange(dated, "2027-06-06", ""), true);
  assert.equal(inTimingRange(dated, "2027-06-30", "2027-06-01"), true);
  assert.equal(inTimingRange(weekly, "2027-06-01", "2027-06-30"), true);
  assert.equal(inTimingRange(undated, "2027-01-01", ""), false);
});
