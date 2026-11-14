/**
 * Calculations for the organizer dashboard. Pure functions: no database, no
 * React, no clock (`today` is always passed in), so they are easy to test.
 *
 * Type-only imports on purpose: the tests load this file with plain Node
 * (node --test "lib/host/*.test.mjs"), which can't resolve the "@/" alias.
 */
import type { EventRow, VendorCategory } from "@/lib/types";
import type { Applicant, ApplicantStatus, HostEvent, ListingActivity } from "./types";

const CATEGORY_ORDER = ["food", "drink", "other"] as const satisfies readonly VendorCategory[];

// ---------------------------------------------------------------------------
// Application pipeline
// ---------------------------------------------------------------------------

export type PipelineCounts = Record<ApplicantStatus, number>;

/** How many applicants are in each status. */
export function pipelineCounts(applicants: Applicant[]): PipelineCounts {
  const counts: PipelineCounts = { new: 0, accepted: 0, waitlisted: 0, declined: 0 };
  for (const applicant of applicants) counts[applicant.status] += 1;
  return counts;
}

/** Accepted vendors out of the total the organizer will take across all categories. */
export function boothsFilled(hostEvent: HostEvent): { filled: number; total: number } {
  const { food, drink, other } = hostEvent.limits;
  return { filled: pipelineCounts(hostEvent.applicants).accepted, total: food + drink + other };
}

// ---------------------------------------------------------------------------
// Deadlines
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** An ISO date as UTC midnight, so a clock change can never shift a day count. */
const utcDay = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

/**
 * Whole days from `today` to `deadline` (both ISO dates, e.g. "2026-11-23").
 * 0 = the deadline is today, negative = it has passed, null = no deadline.
 */
export function daysUntil(deadline: string | null, today: string): number | null {
  if (!deadline) return null;
  return Math.round((utcDay(deadline) - utcDay(today)) / DAY_MS);
}

/** Soonest open deadline first, then events with no deadline, then closed ones. */
export function sortByDeadline(events: HostEvent[], today: string): HostEvent[] {
  const rank = (hostEvent: HostEvent): [group: number, order: number] => {
    const days = daysUntil(hostEvent.event.application_deadline, today);
    if (days == null) return [1, 0];
    return days >= 0 ? [0, days] : [2, -days];
  };
  return [...events].sort((a, b) => {
    const [groupA, orderA] = rank(a);
    const [groupB, orderB] = rank(b);
    return groupA - groupB || orderA - orderB;
  });
}

// ---------------------------------------------------------------------------
// Vendor mix
// ---------------------------------------------------------------------------

/**
 * Share of expected sales each vendor in a category loses when one more
 * similar vendor is accepted.
 *
 * From MASTER.md §4: E[S] = (A × p × T) / (1 + N), where N is the number of
 * competing vendors. With k similar vendors each one has N = k − 1 rivals, so
 * its expected sales scale with 1 / k. Going from k to k + 1 vendors therefore
 * cuts each one's expected sales by 1 / (k + 1).
 *
 * null when there are no similar vendors yet.
 */
export function crowdingDrop(similarAccepted: number): number | null {
  return similarAccepted >= 1 ? 1 / (similarAccepted + 1) : null;
}

export type MixRow = {
  category: VendorCategory;
  accepted: number;
  limit: number;
  /** Spots still open. Never negative. */
  open: number;
  /** At or over a limit that is above 0. */
  full: boolean;
  /** `crowdingDrop` for this category's accepted vendors. */
  nextVendorDrop: number | null;
};

/**
 * Accepted vendors next to the organizer's limit, one row per category that
 * has a limit or an accepted vendor, in food, drink, other order.
 */
export function vendorMix(hostEvent: HostEvent): MixRow[] {
  return CATEGORY_ORDER.map((category) => {
    const accepted = hostEvent.applicants.filter(
      (a) => a.status === "accepted" && a.category === category,
    ).length;
    const limit = hostEvent.limits[category];
    return {
      category,
      accepted,
      limit,
      open: Math.max(limit - accepted, 0),
      full: limit > 0 && accepted >= limit,
      nextVendorDrop: crowdingDrop(accepted),
    };
  }).filter((row) => row.limit > 0 || row.accepted > 0);
}

// ---------------------------------------------------------------------------
// How vendors see the event
// ---------------------------------------------------------------------------

/**
 * The lowest booth fee divided by expected attendance, in dollars (MASTER.md
 * §4, "fee per attendee"). null when either number is missing or attendance is 0.
 */
export function feePerAttendee(
  event: Pick<EventRow, "booth_fee_min" | "booth_fee_max" | "expected_attendance">,
): number | null {
  const fee = event.booth_fee_min ?? event.booth_fee_max;
  if (fee == null || !event.expected_attendance) return null;
  return fee / event.expected_attendance;
}

// ---------------------------------------------------------------------------
// Listing completeness
// ---------------------------------------------------------------------------

export type ChecklistKey =
  | "attendance"
  | "attendanceSource"
  | "electricityFee"
  | "boothSize"
  | "pastVendorList";

export type ChecklistItem = { key: ChecklistKey; label: string; done: boolean };

const hasText = (value: string | null) => Boolean(value && value.trim());

/** The details that make vendors' scores more accurate, and whether each is filled in. */
export function listingChecklist(hostEvent: HostEvent): ChecklistItem[] {
  const { event } = hostEvent;
  return [
    { key: "attendance", label: "Expected attendance", done: event.expected_attendance != null },
    { key: "attendanceSource", label: "Attendance source", done: hasText(event.attendance_source) },
    // A fee of $0 is still an answer, so only null counts as missing.
    { key: "electricityFee", label: "Electricity fee", done: event.electricity_fee != null },
    { key: "boothSize", label: "Booth size", done: hasText(event.booth_size) },
    { key: "pastVendorList", label: "Past vendor list", done: hostEvent.pastVendorListYear != null },
  ];
}

// ---------------------------------------------------------------------------
// Listing activity
// ---------------------------------------------------------------------------

/** Apply clicks as a share of views, 0-1. null when there are no views. */
export function applyRate(activity: ListingActivity): number | null {
  return activity.views > 0 ? activity.applyClicks / activity.views : null;
}
