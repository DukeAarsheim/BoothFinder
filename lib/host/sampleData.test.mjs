// Tests for lib/host/sampleData.ts: the made-up organizer account stays
// consistent with itself and with what the dashboard design says it shows.
// Run: node --test "lib/host/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_HOST } from "./sampleData.ts";
import { boothsFilled, pipelineCounts, vendorMix } from "./metrics.ts";

const byId = (id) => SAMPLE_HOST.events.find((e) => e.event.id === id);
const mixOf = (hostEvent) => vendorMix(hostEvent).map((r) => [r.category, r.accepted, r.limit]);

test("the sample account and every event in it are flagged as sample", () => {
  assert.equal(SAMPLE_HOST.isSample, true);
  assert.equal(SAMPLE_HOST.events.length, 3);
  assert.ok(SAMPLE_HOST.events.every((e) => e.event.is_sample === true));
});

test("event ids are unique", () => {
  const ids = SAMPLE_HOST.events.map((e) => e.event.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every message is about one of the organizer's events", () => {
  for (const message of SAMPLE_HOST.messages) {
    assert.ok(byId(message.eventId), `message ${message.id} points at ${message.eventId}`);
  }
});

test("message ids are unique", () => {
  const ids = SAMPLE_HOST.messages.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("three of the five messages are unread", () => {
  assert.equal(SAMPLE_HOST.messages.length, 5);
  assert.equal(SAMPLE_HOST.messages.filter((m) => m.unread).length, 3);
});

test("no vendor applies twice to the same event", () => {
  for (const hostEvent of SAMPLE_HOST.events) {
    const vendors = hostEvent.applicants.map((a) => a.vendor);
    assert.equal(new Set(vendors).size, vendors.length, hostEvent.event.name);
  }
});

test("accepted vendors never exceed a category's limit", () => {
  for (const hostEvent of SAMPLE_HOST.events) {
    for (const row of vendorMix(hostEvent)) {
      assert.ok(row.accepted <= row.limit, `${hostEvent.event.name}: ${row.category}`);
    }
  }
});

test("vendor_spots on each listing matches the total of its category limits", () => {
  for (const hostEvent of SAMPLE_HOST.events) {
    assert.equal(hostEvent.event.vendor_spots, boothsFilled(hostEvent).total, hostEvent.event.name);
  }
});

test("Holiday Night Market is nearly full, with drink at its limit", () => {
  const market = byId("host-sample-1");
  assert.equal(market.event.name, "Holiday Night Market");
  assert.deepEqual(pipelineCounts(market.applicants), { new: 5, accepted: 19, waitlisted: 3, declined: 2 });
  assert.deepEqual(boothsFilled(market), { filled: 19, total: 24 });
  assert.deepEqual(mixOf(market), [["food", 9, 10], ["drink", 4, 4], ["other", 6, 10]]);
});

test("Harvest on the Plaza is early in its applications", () => {
  const harvest = byId("host-sample-2");
  assert.equal(harvest.event.name, "Harvest on the Plaza");
  assert.deepEqual(pipelineCounts(harvest.applicants), { new: 4, accepted: 5, waitlisted: 0, declined: 1 });
  assert.deepEqual(boothsFilled(harvest), { filled: 5, total: 16 });
  assert.deepEqual(mixOf(harvest), [["food", 3, 12], ["drink", 2, 4]]);
});

test("Harvest on the Plaza keeps the facts of the sample festival on the assistant branch", () => {
  const { event } = byId("host-sample-2");
  assert.equal(event.start_date, "2027-09-18");
  assert.equal(event.end_date, "2027-09-19");
  assert.equal(event.application_deadline, "2027-07-01");
  assert.equal(event.city, "San Luis Obispo");
  assert.equal(event.expected_attendance, 12000);
  assert.equal(event.booth_fee_min, 350);
  assert.equal(event.application_fee, 25);
  assert.equal(event.electricity_fee, 50);
  assert.equal(event.booth_size, "10x10");
});

test("Spring Street Fair is missing attendance, so its checklist has gaps", () => {
  const fair = byId("host-sample-3");
  assert.equal(fair.event.name, "Spring Street Fair");
  assert.equal(fair.event.expected_attendance, null);
  assert.equal(fair.event.electricity_fee, null);
  assert.deepEqual(pipelineCounts(fair.applicants), { new: 6, accepted: 7, waitlisted: 0, declined: 1 });
  assert.deepEqual(boothsFilled(fair), { filled: 7, total: 20 });
  assert.deepEqual(mixOf(fair), [["food", 3, 8], ["drink", 1, 3], ["other", 3, 9]]);
});

test("an event with no vendor reports has no ratings or returning-vendor rate", () => {
  const harvest = byId("host-sample-2");
  assert.equal(harvest.ratings, null);
  assert.equal(harvest.returningVendorRate, null);
  assert.equal(harvest.pastVendorListYear, null);
});
