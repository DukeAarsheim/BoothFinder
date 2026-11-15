// Tests for lib/scoring/climate.ts. Run: node --test "lib/scoring/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { eventMonth, nearestMonthlyHighs } from "./climate.ts";

const points = [
  { lat: 32.7, lng: -117.2, highC: Array(12).fill(20) }, // San Diego
  { lat: 38.9, lng: -120.0, highC: Array(12).fill(10) }, // Lake Tahoe
];

test("picks the closest saved point", () => {
  assert.equal(nearestMonthlyHighs(points, 32.8, -117.1)[0], 20);
  assert.equal(nearestMonthlyHighs(points, 39.0, -120.1)[0], 10);
});

test("gives nothing when the event is too far from any saved point, or has no location", () => {
  assert.equal(nearestMonthlyHighs(points, 36.0, -119.0), null); // Central Valley, far from both
  assert.equal(nearestMonthlyHighs(points, null, -117.1), null);
  assert.equal(nearestMonthlyHighs(points, 32.8, undefined), null);
});

test("month comes from the start date, else the expected window, else nothing", () => {
  assert.equal(eventMonth({ start_date: "2027-07-23" }), 7);
  assert.equal(eventMonth({ start_date: null, timing: { kind: "expected", start: "2027-09-24" } }), 9);
  assert.equal(eventMonth({ start_date: null, timing: { kind: "recurring" } }), null);
  assert.equal(eventMonth({ start_date: null }), null);
});
