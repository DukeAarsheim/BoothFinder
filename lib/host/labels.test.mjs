// Tests for lib/host/labels.ts: the wording the dashboard shows for each state.
// Run: node --test "lib/host/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { completenessNote, crowdingNote, deadlineLabel, feeComparison } from "./labels.ts";

// --- deadlineLabel ----------------------------------------------------------

test("deadlineLabel counts down in days", () => {
  assert.deepEqual(deadlineLabel(47), { value: "47 days", caption: "left to apply", urgent: false });
});

test("deadlineLabel flags the last two weeks as urgent", () => {
  assert.equal(deadlineLabel(14).urgent, true);
  assert.equal(deadlineLabel(15).urgent, false);
});

test("deadlineLabel uses the singular for one day", () => {
  assert.deepEqual(deadlineLabel(1), { value: "1 day", caption: "left to apply", urgent: true });
});

test("deadlineLabel says Today on the deadline day", () => {
  assert.deepEqual(deadlineLabel(0), { value: "Today", caption: "last day to apply", urgent: true });
});

test("deadlineLabel says Closed after the deadline, never a negative number", () => {
  assert.deepEqual(deadlineLabel(-4), {
    value: "Closed",
    caption: "to new applications",
    urgent: false,
  });
});

test("deadlineLabel shows a dash when no deadline is set", () => {
  assert.deepEqual(deadlineLabel(null), { value: "—", caption: "no deadline set", urgent: false });
});

// --- crowdingNote -----------------------------------------------------------

const row = (category, accepted, limit) => ({
  category,
  accepted,
  limit,
  open: Math.max(limit - accepted, 0),
  full: limit > 0 && accepted >= limit,
  nextVendorDrop: accepted > 0 ? 1 / (accepted + 1) : null,
});

test("crowdingNote explains what one more vendor does to a full category", () => {
  assert.equal(
    crowdingNote([row("food", 9, 10), row("drink", 4, 4)]),
    "Drink is full at 4. Accepting one more drink vendor would cut each drink vendor's expected sales by about 20%.",
  );
});

test("crowdingNote uses the fullest category when none is full", () => {
  assert.equal(
    crowdingNote([row("food", 3, 12), row("drink", 2, 4)]),
    "Each drink vendor you add lowers what the others can expect to sell. Going from 2 to 3 would cut each one's expected sales by about 33%.",
  );
});

test("crowdingNote is null when no vendors are accepted yet", () => {
  assert.equal(crowdingNote([row("food", 0, 12)]), null);
});

test("crowdingNote ignores categories that have no limit", () => {
  assert.equal(crowdingNote([row("other", 1, 0)]), null);
});

// --- completenessNote -------------------------------------------------------

const checklist = (missing = []) =>
  [
    ["attendance", "Expected attendance"],
    ["attendanceSource", "Attendance source"],
    ["electricityFee", "Electricity fee"],
    ["boothSize", "Booth size"],
    ["pastVendorList", "Past vendor list"],
  ].map(([key, label]) => ({ key, label, done: !missing.includes(key) }));

test("completenessNote warns that vendors see Estimated scores when attendance is missing", () => {
  const note = completenessNote(checklist(["attendance", "electricityFee"]));
  assert.equal(note.tone, "warning");
  assert.equal(note.title, 'Vendors see "Estimated" scores for this event');
  assert.equal(
    note.body,
    "Expected attendance is missing, so scores are estimated from similar events. Adding it makes your scores more accurate and improves your ranking.",
  );
});

test("completenessNote names the details still to add", () => {
  const note = completenessNote(checklist(["attendanceSource", "pastVendorList"]));
  assert.equal(note.tone, "info");
  assert.equal(note.title, "2 details to add");
  assert.equal(
    note.body,
    "Add the attendance source and past vendor list to make vendors' scores more accurate and improve your ranking.",
  );
});

test("completenessNote uses a serial comma for three or more missing details", () => {
  const note = completenessNote(checklist(["attendanceSource", "electricityFee", "boothSize"]));
  assert.equal(note.title, "3 details to add");
  assert.equal(
    note.body,
    "Add the attendance source, electricity fee, and booth size to make vendors' scores more accurate and improve your ranking.",
  );
});

test("completenessNote uses the singular for one missing detail", () => {
  assert.equal(completenessNote(checklist(["boothSize"])).title, "1 detail to add");
});

test("completenessNote confirms a complete listing", () => {
  assert.deepEqual(completenessNote(checklist()), {
    tone: "info",
    title: "Your listing is complete",
    body: "Vendors see scores based on your own numbers, not estimates.",
  });
});

// --- feeComparison ----------------------------------------------------------

test("feeComparison compares the fee per attendee with the county median", () => {
  assert.equal(
    feeComparison({
      fee: 350,
      perAttendee: 350 / 12000,
      countyMedian: 0.04,
      county: "San Luis Obispo",
    }),
    "Your $350 booth fee is $0.03 per attendee. The San Luis Obispo County median is $0.04.",
  );
});

test("feeComparison leaves out the median when there is none", () => {
  assert.equal(
    feeComparison({ fee: 350, perAttendee: 350 / 12000, countyMedian: null, county: null }),
    "Your $350 booth fee is $0.03 per attendee.",
  );
});

test("feeComparison does not round a tiny fee per attendee down to $0.00", () => {
  assert.equal(
    feeComparison({ fee: 40, perAttendee: 0.004, countyMedian: null, county: null }),
    "Your $40 booth fee is less than $0.01 per attendee.",
  );
});

test("feeComparison asks for attendance instead of dividing by nothing", () => {
  assert.equal(
    feeComparison({ fee: 225, perAttendee: null, countyMedian: 0.05, county: "Santa Barbara" }),
    "Add expected attendance to see your fee per attendee.",
  );
});

test("feeComparison asks for a booth fee when none is listed", () => {
  assert.equal(
    feeComparison({ fee: null, perAttendee: null, countyMedian: 0.05, county: "Santa Barbara" }),
    "Add a booth fee to see your fee per attendee.",
  );
});
