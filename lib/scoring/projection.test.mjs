// Tests for lib/scoring/projection.ts (projection engine v1).
// Run: node --test "lib/scoring/*.test.mjs"
// Node 23.6 or newer loads the .ts file directly, so this needs no packages.
// Cases follow BOOTHFINDER_PROJECTION_ENGINE_SPEC.md §5 and §6.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  breakEven,
  describeFeeRule,
  eventDays,
  fitScore,
  inferFeeRule,
  organizerFee,
  project,
  projectEvent,
  projectionConfidence,
  returnToR,
} from "./projection.ts";

const close = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);

/** The spec's worked example (spec §5). */
const specExample = () => ({
  attendance: 8000,
  attendanceAdjustment: 0.5,
  purchaseRate: 0.1,
  competitors: 3,
  averageTicket: 7,
  transactionsPerHour: 50,
  sellingHours: 8,
  margin: 0.65,
  feeRule: { type: "FLAT", flat: 125 },
  applicationFee: 0,
  powerFee: 0,
  otherCosts: 250,
});

test("spec worked example: $700 gross, $245 COGS, $80 net", () => {
  const p = project(specExample());
  assert.equal(p.ok, true);
  close(p.demandTransactions, 100);
  close(p.capacityTransactions, 400);
  close(p.transactions, 100);
  close(p.grossRevenue, 700);
  close(p.costOfGoods, 245);
  close(p.eventFees, 125);
  close(p.netProfit, 80);
  assert.equal(p.capacityLimited, false);
});

test("MASTER.md worked example still holds: E[S] = $640, Return = 92%", () => {
  // h = 1, effectively no cap, F + C = $200 (as one flat fee)
  const p = project({
    ...specExample(),
    attendanceAdjustment: 1,
    purchaseRate: 0.04,
    averageTicket: 8,
    margin: 0.6,
    transactionsPerHour: 1e9,
    feeRule: { type: "FLAT", flat: 200 },
    otherCosts: 0,
  });
  close(p.grossRevenue, 640);
  close(p.operatingRoi, 0.92);
});

test("1. greater-of fee: max($1,500, 25% × $10,000) = $2,500; $2,000 in sales pays the $1,500 minimum", () => {
  const rule = { type: "GREATER_OF_MIN_OR_PERCENT", minimum: 1500, rate: 0.25 };
  assert.equal(organizerFee(rule, 10_000), 2500);
  assert.equal(organizerFee(rule, 2000), 1500);
  assert.equal(describeFeeRule(rule), "greater of $1,500 or 25% of gross sales");
});

test("2. a 9%-of-sales fee with no minimum and no flat charge", () => {
  const rule = { type: "PERCENT_OF_GROSS", rate: 0.09 };
  close(organizerFee(rule, 1000), 90);
  assert.equal(organizerFee(rule, 0), 0);
  const inferred = inferFeeRule({ booth_fee_min: null, booth_fee_max: null, fee_pct_of_sales: 9, fee_notes: null });
  assert.deepEqual(inferred.rule, rule);
});

test("3. fees stack only when the listing says they are additive", () => {
  const base = { booth_fee_min: 1500, booth_fee_max: null, fee_pct_of_sales: 10 };
  assert.equal(inferFeeRule({ ...base, fee_notes: "$1,500 or 10% of gross, whichever is greater" }).rule.type, "GREATER_OF_MIN_OR_PERCENT");
  assert.equal(inferFeeRule({ ...base, fee_notes: "$1,500 booth plus 10% of gross" }).rule.type, "FLAT_PLUS_PERCENT");
  assert.equal(inferFeeRule({ ...base, fee_notes: null }).rule.type, "UNKNOWN_OR_AMBIGUOUS");
  close(organizerFee({ type: "FLAT_PLUS_PERCENT", flat: 1500, rate: 0.1 }, 5000), 2000);
  close(organizerFee({ type: "FLAT_PLUS_GREATER_OF", flat: 750, minimum: 1000, rate: 0.25 }, 2000), 1750);
});

test("4a. zero attendance: no sales, the fixed costs are the loss", () => {
  const p = project({ ...specExample(), attendance: 0 });
  assert.equal(p.transactions, 0);
  close(p.netProfit, -375);
});

test("4b. zero hours or zero capacity: no sales", () => {
  assert.equal(project({ ...specExample(), sellingHours: 0 }).transactions, 0);
  const p = project({ ...specExample(), transactionsPerHour: 0 });
  assert.equal(p.transactions, 0);
  assert.equal(p.capacityLimited, true);
});

test("4c. unknown attendance: projection unavailable, not zero", () => {
  const p = project({ ...specExample(), attendance: null });
  assert.equal(p.ok, false);
  assert.deepEqual(p.missing, ["attendance"]);
});

test("5. negative inputs and out-of-range percentages are rejected", () => {
  const bad = project({
    ...specExample(),
    otherCosts: -1,
    margin: 1.2,
    purchaseRate: -0.1,
    competitors: 1.5,
    feeRule: { type: "PERCENT_OF_GROSS", rate: 25 },
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.invalid.length, 5);
  assert.equal(project({ ...specExample(), averageTicket: 0 }).ok, false);
});

test("6. projected sales never exceed the booth's throughput", () => {
  const p = project({ ...specExample(), attendance: 400_000, purchaseRate: 0.2, competitors: 0 });
  assert.equal(p.capacityLimited, true);
  assert.equal(p.transactions, 400); // 50/hr × 8 hr
  assert.ok(p.transactions <= p.capacityTransactions);
});

test("7. unknown or ambiguous fee terms make the projection incomplete, never a $0 fee", () => {
  const p = project({ ...specExample(), feeRule: { type: "UNKNOWN_OR_AMBIGUOUS", reason: "unclear" } });
  assert.equal(p.ok, false);
  assert.deepEqual(p.missing, ["fee terms"]);
  assert.equal(inferFeeRule({ booth_fee_min: null, booth_fee_max: null, fee_pct_of_sales: null, fee_notes: null }).rule.type, "UNKNOWN_OR_AMBIGUOUS");
});

test("8. a 2025 fee is never presented as a verified 2027 fee", () => {
  const fee = inferFeeRule({ booth_fee_min: 125, booth_fee_max: null, fee_pct_of_sales: null, fee_notes: null });
  const c = projectionConfidence(
    { expected_attendance: 5000, attendance_source: "Organizer 2026 count", fee_info_year: 2025, start_date: "2027-04-30" },
    fee,
  );
  assert.notEqual(c.confidence, "High");
  assert.ok(c.reasons.some((r) => r.includes("2025")));
});

test("9. each scenario recalculates the percentage fee from its own gross", () => {
  const event = {
    id: "e1",
    expected_attendance: 300_000,
    attendance_source: "Organizer gate count",
    booth_fee_min: 1500,
    booth_fee_max: null,
    fee_pct_of_sales: 25,
    fee_notes: "greater of $1,500 or 25% of gross sales",
    fee_info_year: 2025,
    application_fee: null,
    electricity_fee: null,
    start_date: "2025-07-23",
    end_date: "2025-08-03",
  };
  const brand = { price: 7, margin: 0.6, purchaseRate: 0.1, otherCosts: 500, productType: "cold" };
  const ep = projectEvent(event, brand);
  const fees = ["conservative", "base", "optimistic"].map((s) => ep.scenarios[s].organizerFee);
  const grosses = ["conservative", "base", "optimistic"].map((s) => ep.scenarios[s].grossRevenue);
  fees.forEach((f, k) => close(f, Math.max(1500, 0.25 * grosses[k]), 1e-6));
  assert.ok(new Set(fees).size > 1);
  assert.equal(ep.days, 12);
});

test("10. COGS and other costs are not double-counted", () => {
  const p = project(specExample());
  close(p.totalCosts, p.costOfGoods + p.eventFees + 250);
  close(p.netProfit, p.grossRevenue * 0.65 - 125 - 250);
});

test("break-even: flat fee example needs 83 sales, an 8.3% category purchase rate", () => {
  const b = breakEven(specExample());
  assert.equal(b.reachable, true);
  assert.equal(b.transactions, 83); // 375 / (7 × 0.65) = 82.4 → 83
  close(b.requiredPurchaseRate, (83 * 4) / 4000);
});

test("break-even: unreachable when the percentage fee eats the margin past the minimum", () => {
  // margin 20% < fee 25%: profit rises to the $1,500 minimum's breakpoint, then falls.
  const b = breakEven({
    ...specExample(),
    averageTicket: 10,
    margin: 0.2,
    otherCosts: 0,
    transactionsPerHour: 1000,
    feeRule: { type: "GREATER_OF_MIN_OR_PERCENT", minimum: 1500, rate: 0.25 },
  });
  assert.equal(b.reachable, false);
});

test("break-even: greater-of fee solved on the right segment", () => {
  // margin 60%, $1,500 or 25%: below $6,000 gross the fee is $1,500 → need $2,500 gross = 250 sales at $10.
  const b = breakEven({
    ...specExample(),
    averageTicket: 10,
    margin: 0.6,
    otherCosts: 0,
    transactionsPerHour: 1000,
    feeRule: { type: "GREATER_OF_MIN_OR_PERCENT", minimum: 1500, rate: 0.25 },
  });
  assert.equal(b.transactions, 250);
});

test("Fit: Return → R clamps -100%…+200%; missing ratings use the flagged 0.5 placeholder", () => {
  assert.equal(returnToR(-2), 0);
  close(returnToR(0.5), 0.5);
  assert.equal(returnToR(5), 1);
  const f = fitScore(0.92);
  assert.equal(f.usesPlaceholderRatings, true);
  assert.equal(f.score, Math.round(100 * (0.6 * returnToR(0.92) + 0.25 * 0.5 + 0.15 * 0.5)));
  assert.equal(fitScore(null), null);
});

test("event days: inclusive, null without dates", () => {
  assert.equal(eventDays("2026-07-15", "2026-07-26"), 12);
  assert.equal(eventDays("2026-07-04", null), 1);
  assert.equal(eventDays(null, null), null);
});
