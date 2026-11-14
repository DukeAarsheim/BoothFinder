import { EVENT_TYPES, type EventType } from "@/lib/types";
import type { ExtractedEvent } from "./types";

/**
 * Turns untrusted values (the AI's JSON, or the organizer's edited form) into a
 * valid ExtractedEvent. Anything missing, malformed or out of range becomes
 * null: a blank field is honest, a wrong one is not. Pure, so it runs anywhere.
 */
export function cleanFields(raw: unknown): ExtractedEvent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const text = (v: unknown, max = 200) => {
    if (typeof v !== "string" && typeof v !== "number") return null;
    const s = String(v).trim().replace(/\s+/g, " ");
    return s === "" || /^(null|n\/a|none|unknown|tbd)$/i.test(s) ? null : s.slice(0, max);
  };
  const date = (v: unknown) => {
    const s = text(v);
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s) ? s : null;
  };
  const number = (v: unknown, max: number) => {
    const s = text(v);
    if (!s) return null;
    const n = Number(s.replace(/[$,%\s]/g, ""));
    return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
  };
  const whole = (v: unknown, max: number) => {
    const n = number(v, max);
    return n === null ? null : Math.round(n);
  };
  const url = (v: unknown) => {
    const s = text(v, 500);
    if (!s) return null;
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
    } catch {
      return null;
    }
  };

  const type = text(r.event_type)?.toLowerCase().replace(/[\s-]+/g, "_");
  let start = date(r.start_date);
  let end = date(r.end_date);
  if (start && end && end < start) end = null;
  if (!start && end) [start, end] = [end, null];
  let feeMin = number(r.booth_fee_min, 100_000);
  let feeMax = number(r.booth_fee_max, 100_000);
  if (feeMin !== null && feeMax !== null && feeMin > feeMax) [feeMin, feeMax] = [feeMax, feeMin];

  return {
    name: text(r.name),
    event_type: (EVENT_TYPES as readonly string[]).includes(type ?? "") ? (type as EventType) : null,
    start_date: start,
    end_date: end,
    venue: text(r.venue),
    city: text(r.city, 100),
    application_deadline: date(r.application_deadline),
    booth_fee_min: feeMin,
    booth_fee_max: feeMax,
    booth_size: text(r.booth_size, 100),
    electricity_fee: number(r.electricity_fee, 100_000),
    fee_pct_of_sales: number(r.fee_pct_of_sales, 100),
    expected_attendance: whole(r.expected_attendance, 10_000_000),
    vendor_spots: whole(r.vendor_spots, 100_000),
    apply_url: url(r.apply_url),
  };
}
