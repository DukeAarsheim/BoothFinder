// Tests for lib/host/metrics.ts.
// Run: node --test "lib/host/*.test.mjs"
// Node 23.6 or newer loads the .ts files directly, so this needs no packages.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyRate,
  boothsFilled,
  crowdingDrop,
  daysUntil,
  feePerAttendee,
  listingChecklist,
  pipelineCounts,
  sortByDeadline,
  vendorMix,
} from "./metrics.ts";

const many = (n, category, status) =>
  Array.from({ length: n }, (_, i) => ({
    vendor: `${category} ${status} ${i + 1}`,
    category,
    product: "Test product",
    status,
    appliedOn: "2026-11-01",
  }));

/** A host event with only the fields a test sets. Everything else is empty. */
const hostEvent = ({ event = {}, limits = {}, applicants = [], pastVendorListYear = null } = {}) => ({
  event: {
    id: "test-event",
    name: "Test Fair",
    application_deadline: null,
    booth_fee_min: null,
    booth_fee_max: null,
    expected_attendance: null,
    attendance_source: null,
    electricity_fee: null,
    booth_size: null,
    ...event,
  },
  limits: { food: 0, drink: 0, other: 0, ...limits },
  applicants,
  pastVendorListYear,
});

// --- pipelineCounts ---------------------------------------------------------

test("pipelineCounts counts applicants by status", () => {
  const applicants = [
    ...many(2, "food", "new"),
    ...many(1, "drink", "accepted"),
    ...many(1, "food", "declined"),
  ];
  assert.deepEqual(pipelineCounts(applicants), { new: 2, accepted: 1, waitlisted: 0, declined: 1 });
});

test("pipelineCounts gives zeros when nobody has applied", () => {
  assert.deepEqual(pipelineCounts([]), { new: 0, accepted: 0, waitlisted: 0, declined: 0 });
});

// --- daysUntil --------------------------------------------------------------

test("daysUntil counts whole days to the deadline", () => {
  assert.equal(daysUntil("2026-11-23", "2026-11-14"), 9);
});

test("daysUntil is 0 on the deadline day", () => {
  assert.equal(daysUntil("2026-11-14", "2026-11-14"), 0);
});

test("daysUntil is negative once the deadline has passed", () => {
  assert.equal(daysUntil("2026-11-10", "2026-11-14"), -4);
});

test("daysUntil is null when the event has no deadline", () => {
  assert.equal(daysUntil(null, "2026-11-14"), null);
});

test("daysUntil crosses a month boundary", () => {
  assert.equal(daysUntil("2027-03-01", "2027-02-28"), 1);
});

test("daysUntil is not thrown off by the clock change in March", () => {
  assert.equal(daysUntil("2027-03-20", "2027-03-10"), 10);
});

// --- vendorMix --------------------------------------------------------------

test("vendorMix reports accepted vendors against each limit", () => {
  const rows = vendorMix(
    hostEvent({
      limits: { food: 10, drink: 4 },
      applicants: [
        ...many(9, "food", "accepted"),
        ...many(4, "drink", "accepted"),
        ...many(2, "drink", "waitlisted"),
      ],
    }),
  );
  assert.deepEqual(rows, [
    { category: "food", accepted: 9, limit: 10, open: 1, full: false, nextVendorDrop: 0.1 },
    { category: "drink", accepted: 4, limit: 4, open: 0, full: true, nextVendorDrop: 0.2 },
  ]);
});

test("vendorMix never shows negative open spots when a category is over its limit", () => {
  const [drink] = vendorMix(
    hostEvent({ limits: { drink: 4 }, applicants: many(5, "drink", "accepted") }),
  );
  assert.equal(drink.open, 0);
  assert.equal(drink.full, true);
});

test("vendorMix does not call a category full when its limit is 0", () => {
  const rows = vendorMix(hostEvent({ applicants: many(1, "other", "accepted") }));
  assert.deepEqual(rows, [
    { category: "other", accepted: 1, limit: 0, open: 0, full: false, nextVendorDrop: 0.5 },
  ]);
});

test("vendorMix leaves out categories with no limit and no accepted vendors", () => {
  assert.deepEqual(vendorMix(hostEvent()), []);
});

// --- boothsFilled -----------------------------------------------------------

test("boothsFilled counts accepted vendors against the total of the limits", () => {
  const event = hostEvent({
    limits: { food: 12, drink: 4 },
    applicants: [
      ...many(3, "food", "accepted"),
      ...many(2, "drink", "accepted"),
      ...many(4, "food", "new"),
      ...many(1, "food", "declined"),
    ],
  });
  assert.deepEqual(boothsFilled(event), { filled: 5, total: 16 });
});

test("boothsFilled is 0 of 0 for an event with no limits and no applicants", () => {
  assert.deepEqual(boothsFilled(hostEvent()), { filled: 0, total: 0 });
});

// --- crowdingDrop -----------------------------------------------------------

test("crowdingDrop follows the expected-sales formula in MASTER.md", () => {
  assert.equal(crowdingDrop(1), 0.5);
  assert.equal(crowdingDrop(3), 0.25);
  assert.equal(crowdingDrop(4), 0.2);
});

test("crowdingDrop is null when there are no similar vendors yet", () => {
  assert.equal(crowdingDrop(0), null);
});

// --- feePerAttendee ---------------------------------------------------------

test("feePerAttendee divides the booth fee by expected attendance", () => {
  const event = { booth_fee_min: 350, booth_fee_max: 350, expected_attendance: 12000 };
  assert.equal(feePerAttendee(event), 350 / 12000);
});

test("feePerAttendee uses the lowest fee when fees are tiered", () => {
  const event = { booth_fee_min: 225, booth_fee_max: 400, expected_attendance: 9000 };
  assert.equal(feePerAttendee(event), 225 / 9000);
});

test("feePerAttendee falls back to the only fee listed", () => {
  const event = { booth_fee_min: null, booth_fee_max: 400, expected_attendance: 8000 };
  assert.equal(feePerAttendee(event), 0.05);
});

test("feePerAttendee is null when the fee or the attendance is missing", () => {
  assert.equal(
    feePerAttendee({ booth_fee_min: null, booth_fee_max: null, expected_attendance: 8000 }),
    null,
  );
  assert.equal(
    feePerAttendee({ booth_fee_min: 225, booth_fee_max: 400, expected_attendance: null }),
    null,
  );
});

test("feePerAttendee is null, not Infinity, when attendance is 0", () => {
  assert.equal(
    feePerAttendee({ booth_fee_min: 225, booth_fee_max: 225, expected_attendance: 0 }),
    null,
  );
});

// --- listingChecklist -------------------------------------------------------

test("listingChecklist lists the five details in a fixed order", () => {
  const items = listingChecklist(hostEvent());
  assert.deepEqual(
    items.map((i) => i.key),
    ["attendance", "attendanceSource", "electricityFee", "boothSize", "pastVendorList"],
  );
  assert.deepEqual(
    items.map((i) => i.label),
    ["Expected attendance", "Attendance source", "Electricity fee", "Booth size", "Past vendor list"],
  );
  assert.ok(items.every((i) => i.done === false));
});

test("listingChecklist marks the details that are filled in", () => {
  const items = listingChecklist(
    hostEvent({
      event: {
        expected_attendance: 6500,
        attendance_source: "2025 gate count",
        electricity_fee: 35,
        booth_size: "10x10",
      },
      pastVendorListYear: 2025,
    }),
  );
  assert.ok(items.every((i) => i.done === true));
});

test("listingChecklist counts an electricity fee of $0 as filled in", () => {
  const items = listingChecklist(hostEvent({ event: { electricity_fee: 0 } }));
  assert.equal(items.find((i) => i.key === "electricityFee").done, true);
});

test("listingChecklist treats blank text as missing", () => {
  const items = listingChecklist(hostEvent({ event: { attendance_source: "  ", booth_size: "" } }));
  assert.equal(items.find((i) => i.key === "attendanceSource").done, false);
  assert.equal(items.find((i) => i.key === "boothSize").done, false);
});

// --- applyRate --------------------------------------------------------------

test("applyRate is Apply clicks as a share of views", () => {
  assert.equal(applyRate({ views: 1480, saves: 112, applyClicks: 47 }), 47 / 1480);
});

test("applyRate is null when there are no views", () => {
  assert.equal(applyRate({ views: 0, saves: 0, applyClicks: 0 }), null);
});

// --- sortByDeadline ---------------------------------------------------------

const withDeadline = (id, application_deadline) => hostEvent({ event: { id, application_deadline } });

test("sortByDeadline puts the soonest open deadline first, then no deadline, then closed", () => {
  const sorted = sortByDeadline(
    [
      withDeadline("closed", "2026-11-01"),
      withDeadline("none", null),
      withDeadline("later", "2027-07-01"),
      withDeadline("soon", "2026-11-23"),
    ],
    "2026-11-14",
  );
  assert.deepEqual(
    sorted.map((e) => e.event.id),
    ["soon", "later", "none", "closed"],
  );
});

test("sortByDeadline leaves the list it was given untouched", () => {
  const events = [withDeadline("later", "2027-07-01"), withDeadline("soon", "2026-11-23")];
  sortByDeadline(events, "2026-11-14");
  assert.deepEqual(
    events.map((e) => e.event.id),
    ["later", "soon"],
  );
});
