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
  estimateCompetitors,
  estimatePurchaseRate,
  inferFeeRule,
  organizerFee,
  project,
  projectEvent,
  projectionConfidence,
  returnToR,
  weatherMultiplier,
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

// ── Weather and estimated competitors ───────────────────────────────────────

test("weather: cold drinks sell more in the heat, up to a cap", () => {
  close(weatherMultiplier("cold", 22), 1);
  close(weatherMultiplier("cold", 32), 1.3);
  close(weatherMultiplier("cold", 40), 1.3); // capped
  close(weatherMultiplier("cold", 10), 0.64);
  close(weatherMultiplier("cold", -20), 0.6); // floored
});

test("weather: hot drinks sell less as it warms, down to a floor", () => {
  close(weatherMultiplier("hot", 11), 1);
  close(weatherMultiplier("hot", 0), 1.3); // capped
  close(weatherMultiplier("hot", 25), 0.3);
  close(weatherMultiplier("hot", 35), 0.3); // floored
});

test("competitors: more attendance means more of them, but less than proportionally", () => {
  const at = (n) => estimateCompetitors({ attendance: n, eventType: "fair", vendorSpots: null }).count;
  assert.ok(at(100_000) > at(10_000));
  assert.ok(at(100_000) < 10 * at(10_000));
});

test("competitors: markets pack in more vendors than race expos for the same crowd", () => {
  const at = (t) => estimateCompetitors({ attendance: 20_000, eventType: t, vendorSpots: null }).count;
  assert.ok(at("market") > at("race"));
});

test("competitors: a listed vendor-spot count beats the estimate", () => {
  const c = estimateCompetitors({ attendance: 500_000, eventType: "fair", vendorSpots: 25 });
  assert.equal(c.basis, "listed");
  assert.equal(c.totalVendors, 25);
  assert.equal(c.count, 2); // 25 × 8% = 2
});

test("competitors: a hotter day brings more cold-drink sellers, never fewer than one", () => {
  const base = { attendance: 60_000, eventType: "festival", vendorSpots: null };
  const calm = estimateCompetitors({ ...base, weatherMultiplier: 1 }).count;
  const hot = estimateCompetitors({ ...base, weatherMultiplier: 1.3 }).count;
  assert.ok(hot > calm);
  assert.equal(estimateCompetitors({ attendance: 50, eventType: "race", vendorSpots: null }).count, 1);
  assert.equal(estimateCompetitors({ attendance: null, eventType: "race", vendorSpots: null }).count, 1);
});

test("projection: the weather multiplier scales demand, and defaults to no change", () => {
  const plain = project(specExample());
  const same = project({ ...specExample(), weatherMultiplier: 1 });
  close(same.grossRevenue, plain.grossRevenue);
  const warm = project({ ...specExample(), weatherMultiplier: 1.25 });
  close(warm.demandTransactions, plain.demandTransactions * 1.25);
});

const marketEvent = (over = {}) => ({
  id: "w1",
  event_type: "festival",
  vendor_spots: null,
  expected_attendance: 30_000,
  attendance_source: "Organizer 2026 count",
  booth_fee_min: 400,
  booth_fee_max: null,
  fee_pct_of_sales: null,
  fee_notes: null,
  fee_info_year: 2027,
  application_fee: null,
  electricity_fee: null,
  start_date: "2027-07-10",
  end_date: "2027-07-11",
  ...over,
});
const coldBrand = { price: 7, margin: 0.6, purchaseRate: 0.1, otherCosts: 200, productType: "cold" };
const July = { month: 7, monthlyHighC: [12, 14, 16, 19, 23, 27, 32, 32, 28, 22, 16, 12] };

test("projectEvent: applies the July heat to a cold product and reports it", () => {
  const ep = projectEvent(marketEvent(), coldBrand, July);
  assert.equal(ep.weather.applied, true);
  assert.equal(ep.weather.highC, 32);
  close(ep.weather.multiplier, 1.3);
  assert.equal(ep.competitorsEstimated, true);
  assert.ok(ep.competitors >= 1);
});

test("projectEvent: a hot product is hurt by the same July heat", () => {
  const cold = projectEvent(marketEvent(), coldBrand, July);
  const hot = projectEvent(marketEvent(), { ...coldBrand, productType: "hot" }, July);
  assert.ok(hot.scenarios.base.grossRevenue < cold.scenarios.base.grossRevenue);
});

test("projectEvent: with no climate or month, weather is not applied and says why", () => {
  const ep = projectEvent(marketEvent({ start_date: null }), coldBrand);
  assert.equal(ep.weather.applied, false);
  close(ep.weather.multiplier, 1);
  assert.ok(ep.weather.reason.length > 0);
});

// ── Estimated category purchase rate ────────────────────────────────────────

test("purchase rate: markets buy more than race expos, hot drinks are a narrower category", () => {
  const rate = (eventType, productType, attendance = 10_000) =>
    estimatePurchaseRate({ attendance, eventType, productType }).rate;
  assert.ok(rate("market", "cold") > rate("race", "cold"));
  assert.ok(rate("festival", "hot") < rate("festival", "cold"));
});

test("purchase rate: a bigger crowd means a smaller share of it buys, within sane bounds", () => {
  const rate = (attendance) => estimatePurchaseRate({ attendance, eventType: "fair", productType: "cold" }).rate;
  assert.ok(rate(500_000) < rate(10_000));
  assert.ok(rate(10_000) < rate(500));
  assert.ok(rate(1) <= 0.25 && rate(1e9) >= 0.02);
  // Unknown attendance still gets the event type's base rate.
  assert.ok(estimatePurchaseRate({ attendance: null, eventType: "fair", productType: "cold" }).rate > 0);
});

test("projectEvent: the purchase rate is estimated, so the brand supplies none", () => {
  const brand = { price: 7, margin: 0.6, otherCosts: 200, productType: "cold" };
  const ep = projectEvent(marketEvent(), brand, July);
  assert.equal(ep.purchaseRateEstimated, true);
  assert.ok(ep.purchaseRate > 0 && ep.purchaseRate < 0.25);
  assert.ok(ep.scenarios.base.ok);
});
