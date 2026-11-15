import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boothSizeOptions,
  matchesBoothSize,
  matchesBoothFee,
  matchesProfit,
  matchesSalesCut,
  sortEvents,
  SORT_OPTIONS,
} from "./searchOptions.ts";
const event = (id, fields = {}) => ({
  id,
  name: id,
  start_date: null,
  application_deadline: null,
  county: null,
  city: null,
  event_type: "festival",
  booth_fee_min: null,
  booth_fee_max: null,
  fee_pct_of_sales: null,
  ...fields,
});
test("unknown fees and sales cuts are not free or zero percent", () => {
  const e = event("unknown");
  for (const fn of [matchesBoothFee, matchesSalesCut]) {
    assert.equal(fn(e, ""), true);
    assert.equal(fn(e, "zero"), false);
    assert.equal(fn(e, "100"), false);
    assert.equal(fn(e, "unknown"), true);
  }
  assert.equal(
    matchesBoothFee(event("free", { booth_fee_min: 0 }), "zero"),
    true,
  );
  assert.equal(
    matchesSalesCut(event("none", { fee_pct_of_sales: 0 }), "zero"),
    true,
  );
});
test("budget filters include the boundary and use the lowest listed tier", () => {
  const tiered = event("tiered", {
    booth_fee_min: 250,
    booth_fee_max: 700,
    fee_pct_of_sales: 10,
  });
  assert.equal(matchesBoothFee(tiered, "250"), true);
  assert.equal(matchesBoothFee(tiered, "100"), false);
  assert.equal(matchesSalesCut(tiered, "10"), true);
  assert.equal(matchesSalesCut(tiered, "5"), false);
  assert.equal(
    matchesBoothFee(event("high", { booth_fee_max: 1500 }), "over-1000"),
    true,
  );
  assert.equal(
    matchesBoothFee(event("boundary", { booth_fee_min: 1000 }), "over-1000"),
    false,
  );
  assert.equal(
    matchesSalesCut(event("high", { fee_pct_of_sales: 30 }), "over-25"),
    true,
  );
});
test("numeric sorts keep unknown last in both directions and do not mutate inputs", () => {
  const data = [
    event("unknown"),
    event("paid", { booth_fee_min: 100, fee_pct_of_sales: 10 }),
    event("free", { booth_fee_min: 0, fee_pct_of_sales: 0 }),
  ];
  for (const field of ["fee", "cut"]) {
    assert.deepEqual(
      sortEvents(data, field + "-asc").map((e) => e.id),
      ["free", "paid", "unknown"],
    );
    assert.deepEqual(
      sortEvents(data, field + "-desc").map((e) => e.id),
      ["paid", "free", "unknown"],
    );
  }
  assert.deepEqual(
    data.map((e) => e.id),
    ["unknown", "paid", "free"],
  );
});
test("date, deadline, location and type sort options are available in both directions", () => {
  for (const field of ["date", "deadline", "county", "city", "type", "name"])
    for (const dir of ["asc", "desc"])
      assert.ok(SORT_OPTIONS.some(([key]) => key === field + "-" + dir));
  const data = [
    event("unknown"),
    event("later", {
      start_date: "2027-06-01",
      application_deadline: "2027-04-01",
      county: "Yolo County",
      city: "Zamora",
      event_type: "street_fair",
    }),
    event("earlier", {
      start_date: "2027-01-01",
      application_deadline: "2026-12-01",
      county: "Alameda",
      city: "Alameda",
      event_type: "fair",
    }),
  ];
  for (const field of ["date", "deadline", "county", "city"]) {
    assert.deepEqual(
      sortEvents(data, field + "-asc").map((e) => e.id),
      ["earlier", "later", "unknown"],
    );
    assert.deepEqual(
      sortEvents(data, field + "-desc").map((e) => e.id),
      ["later", "earlier", "unknown"],
    );
  }
});

test("latest-date sorting includes expected windows; attendance keeps unknowns last", () => {
  const rows = [
    event("unknown"),
    event("expected", {
      timing: { kind: "expected", start: "2027-08-01" },
      expected_attendance: 500,
    }),
    event("dated", { start_date: "2027-01-01", expected_attendance: 1000 }),
  ];
  assert.deepEqual(
    sortEvents(rows, "date-desc").map((e) => e.id),
    ["expected", "dated", "unknown"],
  );
  assert.deepEqual(
    sortEvents(rows, "attendance-desc").map((e) => e.id),
    ["dated", "expected", "unknown"],
  );
});

test("booth size matching normalizes symbols, feet and rotated footprints", () => {
  for (const value of [
    "10x20",
    "10 × 20",
    "20 ft by 10 ft",
    "10' x 20’",
    "10x10, 10x20",
  ]) {
    assert.equal(matchesBoothSize({ booth_size: value }, "10x20"), true, value);
  }
  assert.equal(matchesBoothSize({ booth_size: "10x20+" }, "10x20"), false);
  assert.equal(matchesBoothSize({ booth_size: "10x20+" }, "10x20+"), true);
  assert.equal(matchesBoothSize({ booth_size: "10 x 30" }, "10x20"), false);
  assert.equal(matchesBoothSize({ booth_size: "3m x 3m" }, "3x3"), false);
  assert.equal(matchesBoothSize({ booth_size: "3 x 3 meters" }, "3x3"), false);
});
test("booth size choices deduplicate dimensions and preserve non-dimensional descriptions", () => {
  const events = [
    { booth_size: "10×10, 10×20" },
    { booth_size: "20 x 10 feet" },
    { booth_size: "Food truck space" },
    { booth_size: null },
  ];
  const options = boothSizeOptions(events);
  assert.equal(options.filter((o) => o.value === "10x20").length, 1);
  assert.ok(options.some((o) => o.value === "10x10"));
  assert.ok(options.some((o) => o.label === "Food truck space"));
  assert.equal(matchesBoothSize(events[2], "text:food truck space"), true);
  assert.equal(matchesBoothSize(events[3], "unknown"), true);
  assert.equal(matchesBoothSize(events[0], "unknown"), false);
  assert.equal(matchesBoothSize({ booth_size: "TBD" }, "unknown"), true);
});
test("booth size sorting uses the smallest listed footprint and puts unknowns last", () => {
  const rows = [
    event("unknown"),
    event("large", { booth_size: "10x20" }),
    event("small", { booth_size: "10x10, 10x30" }),
  ];
  assert.deepEqual(
    sortEvents(rows, "size-asc").map((e) => e.id),
    ["small", "large", "unknown"],
  );
  assert.deepEqual(
    sortEvents(rows, "size-desc").map((e) => e.id),
    ["large", "small", "unknown"],
  );
});

test("profit filter: needs an estimate, and a missing estimate is never treated as $0", () => {
  assert.equal(matchesProfit(null, ""), true); // no filter keeps everything
  assert.equal(matchesProfit(null, "positive"), false);
  assert.equal(matchesProfit(null, "250"), false);
  assert.equal(matchesProfit(null, "unknown"), true);
  assert.equal(matchesProfit(120, "unknown"), false);
});

test("profit filter: profitable means above $0, thresholds mean at least that much", () => {
  assert.equal(matchesProfit(0, "positive"), false);
  assert.equal(matchesProfit(0.01, "positive"), true);
  assert.equal(matchesProfit(-50, "positive"), false);
  assert.equal(matchesProfit(250, "250"), true);
  assert.equal(matchesProfit(249.99, "250"), false);
  assert.equal(matchesProfit(1200, "1000"), true);
  assert.equal(matchesProfit(900, "1000"), false);
});

test("profit sort: ranks by estimated profit, unknown estimates stay last either way", () => {
  const rows = [event("low"), event("none"), event("high"), event("mid"), event("none2")];
  const profits = new Map([["low", -300], ["high", 900], ["mid", 50], ["none", null]]); // none2 absent
  assert.deepEqual(sortEvents(rows, "profit-desc", profits).map((e) => e.id), ["high", "mid", "low", "none", "none2"]);
  assert.deepEqual(sortEvents(rows, "profit-asc", profits).map((e) => e.id), ["low", "mid", "high", "none", "none2"]);
});

test("profit sort: ties fall back to the event name, and both directions are offered", () => {
  const rows = [event("b"), event("a")];
  const profits = new Map([["a", 100], ["b", 100]]);
  assert.deepEqual(sortEvents(rows, "profit-desc", profits).map((e) => e.id), ["a", "b"]);
  assert.ok(SORT_OPTIONS.some(([k]) => k === "profit-desc"));
  assert.ok(SORT_OPTIONS.some(([k]) => k === "profit-asc"));
});
