// Tests for lib/host/eventExtras.ts: the details an organizer types in by hand
// that the AI extractor does not read.
// Run: node --test "lib/host/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanExtras, createdVia } from "./eventExtras.ts";

const EMPTY = {
  county: null,
  attendance_source: null,
  application_fee: null,
  similar_vendor_limit: null,
  notes: null,
};

test("cleanExtras keeps what the organizer typed", () => {
  assert.deepEqual(
    cleanExtras({
      county: "Santa Barbara",
      attendance_source: "2025 gate count",
      application_fee: "25",
      similar_vendor_limit: "4 drink vendors",
      notes: "Family-friendly. Live music.",
    }),
    {
      county: "Santa Barbara",
      attendance_source: "2025 gate count",
      application_fee: 25,
      similar_vendor_limit: "4 drink vendors",
      notes: "Family-friendly. Live music.",
    },
  );
});

test("cleanExtras turns blanks into null, never an empty string or zero", () => {
  assert.deepEqual(
    cleanExtras({ county: "  ", attendance_source: "", application_fee: "", similar_vendor_limit: " ", notes: "\n" }),
    EMPTY,
  );
});

test("cleanExtras copes with something that is not an object", () => {
  assert.deepEqual(cleanExtras(null), EMPTY);
  assert.deepEqual(cleanExtras("county"), EMPTY);
});

test("cleanExtras drops the word County, because the site adds it when showing the place", () => {
  assert.equal(cleanExtras({ county: "San Luis Obispo County" }).county, "San Luis Obispo");
  assert.equal(cleanExtras({ county: "santa barbara county " }).county, "santa barbara");
});

test("cleanExtras reads an application fee written with a dollar sign or commas", () => {
  assert.equal(cleanExtras({ application_fee: "$1,250.50" }).application_fee, 1250.5);
});

test("cleanExtras keeps an application fee of 0, which means there is no fee", () => {
  assert.equal(cleanExtras({ application_fee: "0" }).application_fee, 0);
  assert.equal(cleanExtras({ application_fee: 0 }).application_fee, 0);
});

test("cleanExtras rejects an application fee that is negative, not a number, or absurd", () => {
  assert.equal(cleanExtras({ application_fee: "-5" }).application_fee, null);
  assert.equal(cleanExtras({ application_fee: "free" }).application_fee, null);
  assert.equal(cleanExtras({ application_fee: "1000000" }).application_fee, null);
});

test("cleanExtras keeps line breaks in notes but trims the ends", () => {
  assert.equal(cleanExtras({ notes: "  Load-in at 2 PM.\nNo generators.  " }).notes, "Load-in at 2 PM.\nNo generators.");
});

test("cleanExtras cuts text that is far too long", () => {
  assert.equal(cleanExtras({ notes: "x".repeat(5000) }).notes.length, 2000);
  assert.equal(cleanExtras({ county: "x".repeat(500) }).county.length, 100);
});

test("cleanExtras ignores values that are not text or numbers", () => {
  assert.deepEqual(cleanExtras({ county: { a: 1 }, notes: ["x"], application_fee: true }), EMPTY);
});

test("createdVia is extractor only when the form says a source was read", () => {
  assert.equal(createdVia("extractor"), "extractor");
  assert.equal(createdVia("manual"), "manual");
  assert.equal(createdVia(undefined), "manual");
  assert.equal(createdVia("anything else"), "manual");
});
