// Tests for lib/host/exportCsv.ts: the applicant list an organizer downloads.
// Run: node --test "lib/host/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { applicantsCsv, csvFileName } from "./exportCsv.ts";

const HEADER = "Event,Vendor,Category,Product,Status,Applied,Sample\r\n";

const hostEvent = (applicants, event = {}) => ({
  event: { name: "Harvest on the Plaza", is_sample: true, ...event },
  applicants,
});

const applicant = (over = {}) => ({
  vendor: "Tri-Tip Trailer",
  category: "food",
  product: "Tri-tip sandwiches",
  status: "accepted",
  appliedOn: "2026-11-02",
  ...over,
});

test("applicantsCsv is just the header row when nobody has applied", () => {
  assert.equal(applicantsCsv(hostEvent([])), HEADER);
});

test("applicantsCsv writes one row per applicant", () => {
  assert.equal(
    applicantsCsv(hostEvent([applicant(), applicant({ vendor: "Valley Kombucha", category: "drink", product: "Kombucha on tap", status: "new", appliedOn: "2026-11-09" })])),
    HEADER +
      "Harvest on the Plaza,Tri-Tip Trailer,food,Tri-tip sandwiches,accepted,2026-11-02,yes\r\n" +
      "Harvest on the Plaza,Valley Kombucha,drink,Kombucha on tap,new,2026-11-09,yes\r\n",
  );
});

test("applicantsCsv labels rows from a made-up event as sample, and real ones as not", () => {
  assert.ok(applicantsCsv(hostEvent([applicant()])).endsWith(",yes\r\n"));
  assert.ok(applicantsCsv(hostEvent([applicant()], { is_sample: false })).endsWith(",no\r\n"));
});

test("applicantsCsv quotes values that contain a comma, a quote or a line break", () => {
  const csv = applicantsCsv(
    hostEvent([applicant({ vendor: 'Salt, Smoke "BBQ"', product: "Pulled pork\nand brisket" })]),
  );
  assert.ok(csv.includes('"Salt, Smoke ""BBQ"""'));
  assert.ok(csv.includes('"Pulled pork\nand brisket"'));
});

test("applicantsCsv stops a value from running as a spreadsheet formula", () => {
  const csv = applicantsCsv(
    hostEvent([
      applicant({ vendor: '=HYPERLINK("http://example.com")' }),
      applicant({ vendor: "+1 Tacos" }),
      applicant({ vendor: "-Dash Deli" }),
      applicant({ vendor: "@Handle Coffee" }),
    ]),
  );
  assert.ok(csv.includes(`"'=HYPERLINK(""http://example.com"")"`));
  assert.ok(csv.includes(",'+1 Tacos,"));
  assert.ok(csv.includes(",'-Dash Deli,"));
  assert.ok(csv.includes(",'@Handle Coffee,"));
});

test("applicantsCsv leaves a hyphen inside a name alone", () => {
  assert.ok(applicantsCsv(hostEvent([applicant()])).includes(",Tri-Tip Trailer,"));
});

test("csvFileName makes a file name from the event name", () => {
  assert.equal(csvFileName("Harvest on the Plaza"), "harvest-on-the-plaza-applicants.csv");
});

test("csvFileName drops accents and punctuation", () => {
  assert.equal(csvFileName("Señor Taco's Night Market!"), "senor-taco-s-night-market-applicants.csv");
});

test("csvFileName falls back to a plain name when the event name is blank", () => {
  assert.equal(csvFileName("  "), "event-applicants.csv");
});
