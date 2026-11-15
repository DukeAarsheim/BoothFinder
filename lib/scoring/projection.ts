// ─────────────────────────────────────────────────────────────────────────────
// BoothFinder projection engine, v1.
//
// Spec: BOOTHFINDER_PROJECTION_ENGINE_SPEC.md (team Drive, approved Nov 14 2026),
// Stage A. MASTER.md §4 is the original formula; with h = 1, no capacity cap and
// a flat fee this reduces to it exactly (see the MASTER worked example test).
//
// PURE FUNCTIONS ONLY: no database, no React, no network. The UI calls these on
// every keystroke to re-rank events instantly.
//
// This file is deliberately self-contained (no runtime imports) so the tests can
// load it straight into Node:  node --test "lib/scoring/*.test.mjs"
//
// Every default below is an ASSUMPTION from the team's market research, not a
// measured fact. Change them here, nowhere else.
// ─────────────────────────────────────────────────────────────────────────────

import type { BrandProfile, EventRow } from "@/lib/types";

export const PROJECTION_MODEL_VERSION = "projection-v1 (2026-11-14)";

// ── Assumptions (spec §4.4) ─────────────────────────────────────────────────

export type ScenarioName = "conservative" | "base" | "optimistic";
export const SCENARIO_NAMES: ScenarioName[] = ["conservative", "base", "optimistic"];

/**
 * Scenario multipliers. The brand's own numbers are the BASE case; the other two
 * scale them. With the defaults below (10% purchase rate, 50 transactions/hour)
 * this reproduces the spec table: p 5/10/20%, U 30/50/80, h 0.25/0.5/1.0.
 * These are sensitivity ranges, not statistical confidence intervals.
 */
export const SCENARIOS: Record<
  ScenarioName,
  { attendanceAdjustment: number; purchaseRateFactor: number; throughputFactor: number }
> = {
  conservative: { attendanceAdjustment: 0.25, purchaseRateFactor: 0.5, throughputFactor: 0.6 },
  base: { attendanceAdjustment: 0.5, purchaseRateFactor: 1, throughputFactor: 1 },
  optimistic: { attendanceAdjustment: 1, purchaseRateFactor: 2, throughputFactor: 1.6 },
};

/** Used when the brand hasn't entered these yet. All are labeled "Assumed" in the UI. */
export const DEFAULT_ASSUMPTIONS = {
  /** N: direct competitors in the same category. Events rarely publish this. */
  competitors: 3,
  /** U: transactions one booth can serve per hour (coffee cart / truck benchmarks). */
  transactionsPerHour: 50,
  /** Selling hours per event day. H = days × this. */
  sellingHoursPerDay: 8,
};

// ── Fit score (MASTER.md §4) ────────────────────────────────────────────────

export const FIT_WEIGHTS = { return: 0.6, audience: 0.25, organization: 0.15 };
/** Neutral rating used when an event has no vendor ratings. Never shown as real quality. */
export const NEUTRAL_RATING = 0.5;
/**
 * Return → R mapping (decided Nov 14 2026, see MASTER.md §10):
 * clamp an operating return of -100% … +200% linearly onto 0 … 1.
 */
export const RETURN_TO_R = { min: -1, max: 2 };

// ── Fee rules (spec §4.3) ───────────────────────────────────────────────────

export type FeeRule =
  | { type: "FLAT"; flat: number }
  | { type: "PERCENT_OF_GROSS"; rate: number }
  | { type: "GREATER_OF_MIN_OR_PERCENT"; minimum: number; rate: number }
  | { type: "FLAT_PLUS_PERCENT"; flat: number; rate: number }
  | { type: "FLAT_PLUS_GREATER_OF"; flat: number; minimum: number; rate: number }
  | { type: "UNKNOWN_OR_AMBIGUOUS"; reason: string };

/** The organizer's fee for a given gross revenue, or null when the terms are unknown. */
export function organizerFee(rule: FeeRule, gross: number): number | null {
  switch (rule.type) {
    case "FLAT":
      return rule.flat;
    case "PERCENT_OF_GROSS":
      return rule.rate * gross;
    case "GREATER_OF_MIN_OR_PERCENT":
      return Math.max(rule.minimum, rule.rate * gross);
    case "FLAT_PLUS_PERCENT":
      return rule.flat + rule.rate * gross;
    case "FLAT_PLUS_GREATER_OF":
      return rule.flat + Math.max(rule.minimum, rule.rate * gross);
    case "UNKNOWN_OR_AMBIGUOUS":
      return null;
  }
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;

/** Plain-English formula, e.g. "greater of $1,500 or 25% of gross sales". */
export function describeFeeRule(rule: FeeRule): string {
  switch (rule.type) {
    case "FLAT":
      return `${usd(rule.flat)} flat`;
    case "PERCENT_OF_GROSS":
      return `${pct(rule.rate)} of gross sales`;
    case "GREATER_OF_MIN_OR_PERCENT":
      return `greater of ${usd(rule.minimum)} or ${pct(rule.rate)} of gross sales`;
    case "FLAT_PLUS_PERCENT":
      return `${usd(rule.flat)} plus ${pct(rule.rate)} of gross sales`;
    case "FLAT_PLUS_GREATER_OF":
      return `${usd(rule.flat)} plus the greater of ${usd(rule.minimum)} or ${pct(rule.rate)} of gross sales`;
    case "UNKNOWN_OR_AMBIGUOUS":
      return `unknown (${rule.reason})`;
  }
}

/**
 * Reads a fee rule from an event's listing fields. The events table has no
 * fee-rule column yet, so when a listing has BOTH a dollar amount and a
 * percentage, the fee notes must say how they combine ("greater of",
 * "whichever is greater" → greater-of; "plus" → additive). Anything else stays
 * UNKNOWN: we never silently add, drop, or zero a fee (spec §2, test 7).
 */
export function inferFeeRule(e: {
  booth_fee_min: number | null;
  booth_fee_max: number | null;
  fee_pct_of_sales: number | null;
  fee_notes: string | null;
}): { rule: FeeRule; inferredFromNotes: boolean; tiered: boolean } {
  const flat = e.booth_fee_min ?? e.booth_fee_max;
  const tiered =
    e.booth_fee_min != null && e.booth_fee_max != null && e.booth_fee_max > e.booth_fee_min;
  const rate = e.fee_pct_of_sales == null ? null : e.fee_pct_of_sales / 100;
  const notes = (e.fee_notes ?? "").toLowerCase();

  if (flat == null && rate == null) {
    return {
      rule: { type: "UNKNOWN_OR_AMBIGUOUS", reason: "no fee listed" },
      inferredFromNotes: false,
      tiered: false,
    };
  }
  if (rate == null) return { rule: { type: "FLAT", flat: flat! }, inferredFromNotes: false, tiered };
  if (flat == null) {
    return { rule: { type: "PERCENT_OF_GROSS", rate }, inferredFromNotes: false, tiered: false };
  }
  if (/greater|whichever|minimum guarantee|or \d+\s?%/.test(notes)) {
    return {
      rule: { type: "GREATER_OF_MIN_OR_PERCENT", minimum: flat, rate },
      inferredFromNotes: true,
      tiered,
    };
  }
  if (/\bplus\b|in addition|\+/.test(notes)) {
    return { rule: { type: "FLAT_PLUS_PERCENT", flat, rate }, inferredFromNotes: true, tiered };
  }
  return {
    rule: {
      type: "UNKNOWN_OR_AMBIGUOUS",
      reason: "listing has a dollar fee and a percentage, but doesn't say how they combine",
    },
    inferredFromNotes: false,
    tiered,
  };
}

// ── Projection (spec §4.1–4.3) ──────────────────────────────────────────────

export interface ProjectionInputs {
  /** A: reported attendance for the whole paid period. null = unknown. */
  attendance: number | null;
  /** h: attendance adjustment, 0–1. */
  attendanceAdjustment: number;
  /** p: category-wide purchase rate across all competing vendors, 0–1. */
  purchaseRate: number;
  /** N: direct competitors (integer ≥ 0). */
  competitors: number;
  /** T: average ticket, USD > 0. */
  averageTicket: number;
  /** U: transactions per selling hour ≥ 0. */
  transactionsPerHour: number;
  /** H: total selling hours over the whole event ≥ 0 (compatible with A). */
  sellingHours: number;
  /** m: gross margin after COGS, before event fees, 0–1. */
  margin: number;
  feeRule: FeeRule;
  /** Nonrefundable application fee. */
  applicationFee: number;
  /** Electricity fee. */
  powerFee: number;
  /** C: other incremental event costs not counted in margin or fees. */
  otherCosts: number;
}

export interface ProjectionResult {
  ok: true;
  demandTransactions: number;
  capacityTransactions: number;
  /** min(demand, capacity) */
  transactions: number;
  /** true when the booth's serving capacity, not demand, limits sales. */
  capacityLimited: boolean;
  grossRevenue: number;
  costOfGoods: number;
  organizerFee: number;
  /** organizer fee + application fee + power fee */
  eventFees: number;
  totalCosts: number;
  netProfit: number;
  /** net profit ÷ (event fees + other costs). null when that outlay is zero. */
  operatingRoi: number | null;
}

export interface ProjectionUnavailable {
  ok: false;
  /** Inputs that are missing (e.g. "attendance", "fee terms"). */
  missing: string[];
  /** Inputs that are out of range. */
  invalid: string[];
}

export type Projection = ProjectionResult | ProjectionUnavailable;

const isNum = (x: number) => typeof x === "number" && Number.isFinite(x);
const in01 = (x: number) => isNum(x) && x >= 0 && x <= 1;
const nonNeg = (x: number) => isNum(x) && x >= 0;

function feeRuleProblems(rule: FeeRule): string[] {
  const bad: string[] = [];
  if ("rate" in rule && !in01(rule.rate)) bad.push("fee percentage (must be 0–100%)");
  if ("flat" in rule && !nonNeg(rule.flat)) bad.push("flat fee (must be ≥ 0)");
  if ("minimum" in rule && !nonNeg(rule.minimum)) bad.push("minimum fee (must be ≥ 0)");
  return bad;
}

/** Checks inputs; returns what's missing and what's out of range. */
export function checkInputs(i: ProjectionInputs): { missing: string[]; invalid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];
  if (i.attendance == null) missing.push("attendance");
  else if (!nonNeg(i.attendance)) invalid.push("attendance (must be ≥ 0)");
  if (i.feeRule.type === "UNKNOWN_OR_AMBIGUOUS") missing.push("fee terms");
  if (!in01(i.attendanceAdjustment)) invalid.push("attendance adjustment (must be 0–1)");
  if (!in01(i.purchaseRate)) invalid.push("purchase rate (must be 0–100%)");
  if (!nonNeg(i.competitors) || !Number.isInteger(i.competitors))
    invalid.push("competitors (must be a whole number ≥ 0)");
  if (!isNum(i.averageTicket) || i.averageTicket <= 0) invalid.push("average sale (must be > $0)");
  if (!nonNeg(i.transactionsPerHour)) invalid.push("transactions per hour (must be ≥ 0)");
  if (!nonNeg(i.sellingHours)) invalid.push("selling hours (must be ≥ 0)");
  if (!in01(i.margin)) invalid.push("gross margin (must be 0–100%)");
  if (!nonNeg(i.applicationFee)) invalid.push("application fee (must be ≥ 0)");
  if (!nonNeg(i.powerFee)) invalid.push("power fee (must be ≥ 0)");
  if (!nonNeg(i.otherCosts)) invalid.push("other costs (must be ≥ 0)");
  invalid.push(...feeRuleProblems(i.feeRule));
  return { missing, invalid };
}

/** Profit at a given number of transactions (used by projection and break-even). */
function profitAt(i: ProjectionInputs, transactions: number): number {
  const gross = transactions * i.averageTicket;
  const fee = organizerFee(i.feeRule, gross) ?? 0;
  return gross * i.margin - fee - i.applicationFee - i.powerFee - i.otherCosts;
}

/** Projects one event under one set of inputs (spec §4.2–4.3). */
export function project(i: ProjectionInputs): Projection {
  const { missing, invalid } = checkInputs(i);
  if (missing.length || invalid.length) return { ok: false, missing, invalid };

  const accessible = i.attendance! * i.attendanceAdjustment;
  const demandTransactions = (accessible * i.purchaseRate) / (1 + i.competitors);
  const capacityTransactions = i.transactionsPerHour * i.sellingHours;
  const transactions = Math.min(demandTransactions, capacityTransactions);
  const grossRevenue = transactions * i.averageTicket;
  const costOfGoods = grossRevenue * (1 - i.margin);
  const fee = organizerFee(i.feeRule, grossRevenue)!;
  const eventFees = fee + i.applicationFee + i.powerFee;
  const totalCosts = costOfGoods + eventFees + i.otherCosts;
  const netProfit = grossRevenue - totalCosts;
  const outlay = eventFees + i.otherCosts;

  return {
    ok: true,
    demandTransactions,
    capacityTransactions,
    transactions,
    capacityLimited: capacityTransactions < demandTransactions,
    grossRevenue,
    costOfGoods,
    organizerFee: fee,
    eventFees,
    totalCosts,
    netProfit,
    operatingRoi: outlay > 0 ? netProfit / outlay : null,
  };
}

// ── Break-even (spec §6) ────────────────────────────────────────────────────

export type BreakEven =
  | {
      reachable: true;
      /** Smallest whole number of transactions with profit ≥ 0. */
      transactions: number;
      /** Category purchase rate needed (0–1+). null when attendance × h is 0. */
      requiredPurchaseRate: number | null;
    }
  | { reachable: false; reason: string };

/**
 * Smallest whole number of transactions (0 … capacity) where profit ≥ 0.
 * Fee rules are piecewise linear in gross sales, so profit is piecewise linear in
 * transactions. We split at the greater-of breakpoint and solve each straight
 * segment exactly, so it stays correct even when a percentage fee exceeds the
 * margin (profit then FALLS with more sales on that segment).
 */
export function breakEven(i: ProjectionInputs): BreakEven {
  const { missing, invalid } = checkInputs(i);
  if (missing.length || invalid.length) {
    return { reachable: false, reason: `missing or invalid: ${[...missing, ...invalid].join(", ")}` };
  }
  const capacity = Math.floor(i.transactionsPerHour * i.sellingHours);

  const points = [0, capacity];
  const r = i.feeRule;
  if ((r.type === "GREATER_OF_MIN_OR_PERCENT" || r.type === "FLAT_PLUS_GREATER_OF") && r.rate > 0) {
    const t = r.minimum / r.rate / i.averageTicket;
    if (t > 0 && t < capacity) points.push(t);
  }
  points.sort((a, b) => a - b);

  let found: number | null = null;
  for (let k = 0; k < points.length - 1 && found == null; k++) {
    const a = points[k];
    const b = points[k + 1];
    const pa = profitAt(i, a);
    const pb = profitAt(i, b);
    if (pa >= 0) {
      found = Math.ceil(a);
    } else if (pb >= 0) {
      const t = a + (-pa * (b - a)) / (pb - pa);
      let whole = Math.ceil(t - 1e-9);
      // Guard against float noise right at the root.
      while (whole <= capacity && profitAt(i, whole) < 0) whole++;
      if (whole <= capacity) found = whole;
    }
  }
  if (found == null && capacity === 0 && profitAt(i, 0) >= 0) found = 0;

  if (found == null) {
    return {
      reachable: false,
      reason:
        capacity === 0
          ? "no selling capacity (0 hours or 0 transactions per hour)"
          : "not reachable within the booth's estimated capacity",
    };
  }
  const reach = (i.attendance ?? 0) * i.attendanceAdjustment;
  return {
    reachable: true,
    transactions: found,
    requiredPurchaseRate: reach > 0 ? (found * (1 + i.competitors)) / reach : null,
  };
}

// ── Fit score (MASTER.md §4) ────────────────────────────────────────────────

/** Return (e.g. 0.92 = 92%) → R on 0–1 using RETURN_TO_R. */
export function returnToR(operatingReturn: number): number {
  const { min, max } = RETURN_TO_R;
  return Math.min(1, Math.max(0, (operatingReturn - min) / (max - min)));
}

/**
 * Fit = 100 × (0.6 R + 0.25 Q_audience + 0.15 Q_organization). Ratings default to
 * NEUTRAL_RATING; `usesPlaceholderRatings` tells the UI to say so.
 */
export function fitScore(
  operatingReturn: number | null,
  ratings: { audience?: number | null; organization?: number | null } = {},
): { score: number; usesPlaceholderRatings: boolean } | null {
  if (operatingReturn == null || !Number.isFinite(operatingReturn)) return null;
  const qa = ratings.audience ?? NEUTRAL_RATING;
  const qo = ratings.organization ?? NEUTRAL_RATING;
  const w = FIT_WEIGHTS;
  return {
    score: Math.round(100 * (w.return * returnToR(operatingReturn) + w.audience * qa + w.organization * qo)),
    usesPlaceholderRatings: ratings.audience == null || ratings.organization == null,
  };
}

// ── Events → inputs ─────────────────────────────────────────────────────────

/** Whole days covered by an event, or null when the listing has no dates. */
export function eventDays(start: string | null, end: string | null): number | null {
  if (!start) return null;
  if (!end) return 1;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 86_400_000) + 1;
}

export type Confidence = "High" | "Medium" | "Low" | "Insufficient data";

export interface EventProjection {
  eventId: string;
  feeRule: FeeRule;
  feeRuleInferredFromNotes: boolean;
  feeTiered: boolean;
  /** Days used for selling hours; `daysAssumed` when the listing has no dates. */
  days: number;
  daysAssumed: boolean;
  competitors: number;
  competitorsAssumed: boolean;
  transactionsPerHour: number;
  sellingHoursPerDay: number;
  scenarios: Record<ScenarioName, Projection>;
  breakEven: BreakEven;
  fit: { score: number; usesPlaceholderRatings: boolean } | null;
  confidence: Confidence;
  confidenceReasons: string[];
}

type EventFields = Pick<
  EventRow,
  | "id"
  | "expected_attendance"
  | "attendance_source"
  | "booth_fee_min"
  | "booth_fee_max"
  | "fee_pct_of_sales"
  | "fee_notes"
  | "fee_info_year"
  | "application_fee"
  | "electricity_fee"
  | "start_date"
  | "end_date"
>;

/** Inputs for one event, one brand, one scenario. */
export function eventInputs(
  e: EventFields,
  brand: BrandProfile,
  scenario: ScenarioName,
  feeRule: FeeRule = inferFeeRule(e).rule,
): ProjectionInputs {
  const s = SCENARIOS[scenario];
  const days = eventDays(e.start_date, e.end_date) ?? 1;
  const hoursPerDay = brand.sellingHoursPerDay ?? DEFAULT_ASSUMPTIONS.sellingHoursPerDay;
  const throughput = brand.transactionsPerHour ?? DEFAULT_ASSUMPTIONS.transactionsPerHour;
  return {
    attendance: e.expected_attendance,
    attendanceAdjustment: s.attendanceAdjustment,
    purchaseRate: Math.min(1, brand.purchaseRate * s.purchaseRateFactor),
    competitors: brand.competitors ?? DEFAULT_ASSUMPTIONS.competitors,
    averageTicket: brand.price,
    transactionsPerHour: throughput * s.throughputFactor,
    sellingHours: days * hoursPerDay,
    margin: brand.margin,
    feeRule,
    applicationFee: e.application_fee ?? 0,
    powerFee: e.electricity_fee ?? 0,
    otherCosts: brand.otherCosts,
  };
}

/**
 * Confidence is about the EVIDENCE behind the inputs, not a statistical
 * probability (spec §3).
 */
export function projectionConfidence(
  e: Pick<EventFields, "expected_attendance" | "attendance_source" | "fee_info_year" | "start_date">,
  fee: { rule: FeeRule; inferredFromNotes: boolean; tiered: boolean },
): { confidence: Confidence; reasons: string[] } {
  const reasons: string[] = [];
  if (e.expected_attendance == null) reasons.push("No attendance figure");
  if (fee.rule.type === "UNKNOWN_OR_AMBIGUOUS") reasons.push(`Fee terms ${fee.rule.reason}`);
  if (reasons.length) return { confidence: "Insufficient data", reasons };

  let downgrades = 0;
  const source = (e.attendance_source ?? "").toLowerCase();
  if (!source) {
    downgrades++;
    reasons.push("Attendance has no stated source");
  } else if (/estimat|claim|approx|about|~|media/.test(source)) {
    downgrades++;
    reasons.push("Attendance is an estimate or organizer claim");
  }
  const eventYear = e.start_date ? Number(e.start_date.slice(0, 4)) : null;
  if (e.fee_info_year == null) {
    downgrades++;
    reasons.push("Fee year unknown");
  } else if (eventYear != null && e.fee_info_year < eventYear) {
    downgrades++;
    reasons.push(`Fee terms are from ${e.fee_info_year}, not ${eventYear}`);
  }
  if (fee.inferredFromNotes) {
    downgrades++;
    reasons.push("Fee formula read from the listing's notes");
  }
  if (fee.tiered) reasons.push("Tiered booth fee: lowest tier used");

  const confidence: Confidence = downgrades === 0 ? "High" : downgrades === 1 ? "Medium" : "Low";
  return { confidence, reasons };
}

/** Everything the vendor screens need for one event. */
export function projectEvent(e: EventFields, brand: BrandProfile): EventProjection {
  const fee = inferFeeRule(e);
  const days = eventDays(e.start_date, e.end_date);
  const scenarios = Object.fromEntries(
    SCENARIO_NAMES.map((s) => [s, project(eventInputs(e, brand, s, fee.rule))]),
  ) as Record<ScenarioName, Projection>;
  const base = scenarios.base;
  const { confidence, reasons } = projectionConfidence(e, fee);
  return {
    eventId: e.id,
    feeRule: fee.rule,
    feeRuleInferredFromNotes: fee.inferredFromNotes,
    feeTiered: fee.tiered,
    days: days ?? 1,
    daysAssumed: days == null,
    competitors: brand.competitors ?? DEFAULT_ASSUMPTIONS.competitors,
    competitorsAssumed: brand.competitors == null,
    transactionsPerHour: brand.transactionsPerHour ?? DEFAULT_ASSUMPTIONS.transactionsPerHour,
    sellingHoursPerDay: brand.sellingHoursPerDay ?? DEFAULT_ASSUMPTIONS.sellingHoursPerDay,
    scenarios,
    breakEven: breakEven(eventInputs(e, brand, "base", fee.rule)),
    fit: base.ok ? fitScore(base.operatingRoi) : null,
    confidence,
    confidenceReasons: reasons,
  };
}
