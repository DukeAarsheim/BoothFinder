import { test } from "node:test";
import assert from "node:assert/strict";
import { inDateRange } from "./dateFilter.ts";

const oneDay = { start_date: "2027-04-08", end_date: null };
const multiDay = { start_date: "2027-05-01", end_date: "2027-05-03" };
const undated = { start_date: null, end_date: null };

test("no range keeps every event, dated or not", () => {
  for (const e of [oneDay, multiDay, undated]) assert.equal(inDateRange(e, "", ""), true);
});
test("range ends are inclusive", () => {
  assert.equal(inDateRange(oneDay, "2027-04-08", "2027-04-08"), true);
  assert.equal(inDateRange(oneDay, "2027-04-09", "2027-04-30"), false);
  assert.equal(inDateRange(oneDay, "2027-04-01", "2027-04-07"), false);
});
test("a multi-day event counts when any of its days is in the range", () => {
  assert.equal(inDateRange(multiDay, "2027-05-03", "2027-05-10"), true);
  assert.equal(inDateRange(multiDay, "2027-04-20", "2027-05-01"), true);
  assert.equal(inDateRange(multiDay, "2027-05-02", "2027-05-02"), true);
  assert.equal(inDateRange(multiDay, "2027-05-04", "2027-05-10"), false);
});
test("one end can be left open", () => {
  assert.equal(inDateRange(multiDay, "2027-05-03", ""), true);
  assert.equal(inDateRange(multiDay, "2027-05-04", ""), false);
  assert.equal(inDateRange(multiDay, "", "2027-05-01"), true);
  assert.equal(inDateRange(multiDay, "", "2027-04-30"), false);
});
test("dates picked in the wrong order mean the same range", () => {
  assert.equal(inDateRange(oneDay, "2027-04-30", "2027-04-01"), true);
  assert.equal(inDateRange(multiDay, "2027-04-30", "2027-04-01"), false);
});
test("an event with no start date is left out once a range is set", () => {
  assert.equal(inDateRange(undated, "2027-01-01", ""), false);
  assert.equal(inDateRange(undated, "", "2027-12-31"), false);
});
test("timestamps are compared by their day", () => {
  assert.equal(inDateRange({ start_date: "2027-04-08T19:00:00Z", end_date: null }, "2027-04-08", "2027-04-08"), true);
});
