import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyHostFields } from "./verify.ts";

const blank = {
  name: null, event_type: null, start_date: null, end_date: null, venue: null, city: null,
  application_deadline: null, booth_fee_min: null, booth_fee_max: null, booth_size: null,
  electricity_fee: null, fee_pct_of_sales: null, expected_attendance: null,
  vendor_spots: null, apply_url: null,
};
const source = "Demo Market returns June 5, 2027. Food booths cost $250. There are 50 vendor spaces. No sales cut is charged.";

test("organizer extraction keeps only values supported by a quote from the source", () => {
  const out = verifyHostFields(
    { ...blank, name: "Demo Market", start_date: "2027-06-05", booth_fee_min: 250, booth_fee_max: 9999, vendor_spots: 50, expected_attendance: 999999 },
    { name: "Demo Market returns June 5, 2027.", start_date: "Demo Market returns June 5, 2027.", booth_fee_min: "Food booths cost $250.", booth_fee_max: "Food booths cost $250.", vendor_spots: "There are 50 vendor spaces.", expected_attendance: "999999 attendees" },
    source,
  );
  assert.equal(out.fields.name, "Demo Market");
  assert.equal(out.fields.start_date, "2027-06-05");
  assert.equal(out.fields.booth_fee_min, 250);
  assert.equal(out.fields.vendor_spots, 50);
  assert.equal(out.fields.booth_fee_max, null);
  assert.equal(out.fields.expected_attendance, null);
  assert.equal(out.evidence.booth_fee_max, undefined);
});

test("a missing event name does not discard other verified facts", () => {
  const out = verifyHostFields({ ...blank, booth_fee_min: 250 }, { booth_fee_min: "Food booths cost $250." }, source);
  assert.equal(out.fields.name, null);
  assert.equal(out.fields.booth_fee_min, 250);
});

test("a date or attendance count in a quote cannot masquerade as a fee", () => {
  const out = verifyHostFields(
    { ...blank, booth_fee_min: 2027, electricity_fee: 50 },
    { booth_fee_min: "Demo Market returns June 5, 2027.", electricity_fee: "There are 50 vendor spaces." },
    source,
  );
  assert.equal(out.fields.booth_fee_min, null);
  assert.equal(out.fields.electricity_fee, null);
});

test("a refundable deposit is not accepted as a booth fee", () => {
  const text = "A refundable $250 deposit will be returned after the market.";
  const out = verifyHostFields({ ...blank, booth_fee_min: 250 }, { booth_fee_min: text }, text);
  assert.equal(out.fields.booth_fee_min, null);
});

test("zero sales cut, event type and booth dimensions need supporting text", () => {
  const out = verifyHostFields(
    { ...blank, event_type: "market", booth_size: "10 x 10 ft", fee_pct_of_sales: 0 },
    { event_type: "Demo Market returns June 5, 2027.", booth_size: "Food booths cost $250.", fee_pct_of_sales: "No sales cut is charged." },
    source,
  );
  assert.equal(out.fields.event_type, "market");
  assert.equal(out.fields.booth_size, null);
  assert.equal(out.fields.fee_pct_of_sales, 0);
  const zero = "Organizers take 0% of sales.";
  assert.equal(verifyHostFields({ ...blank, fee_pct_of_sales: 0 }, { fee_pct_of_sales: zero }, zero).fields.fee_pct_of_sales, 0);
});
