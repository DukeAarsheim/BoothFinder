/**
 * Shapes for the organizer ("host") dashboard at /host/dashboard.
 *
 * Nothing here is stored yet: there are no organizer accounts and no tables for
 * applications or messages. The dashboard reads the labelled sample account in
 * ./sampleData.ts. `HostEvent.event` is a real `events` row shape on purpose, so
 * real rows can replace the samples later.
 */
import type { EventRow, VendorCategory } from "@/lib/types";

export type ApplicantStatus = "new" | "accepted" | "waitlisted" | "declined";

/** One vendor's application to one event. */
export type Applicant = {
  vendor: string;
  category: VendorCategory;
  product: string;
  status: ApplicantStatus;
  /** ISO date the application arrived, e.g. "2026-11-02". */
  appliedOn: string;
};

/** The Fit score range (0-100) a common type of vendor sees for an event. */
export type FitRange = { vendorType: string; low: number; high: number };

/** Vendor ratings as totals only. Individual reports are never exposed to organizers. */
export type RatingTotals = {
  /** How many vendor reports the averages come from. */
  reports: number;
  /** Average audience-fit rating, 1-5. */
  audienceFit: number;
  /** Average organization rating, 1-5. */
  organization: number;
};

/** Listing activity over the last 30 days. */
export type ListingActivity = { views: number; saves: number; applyClicks: number };

/** One event as its organizer sees it. */
export type HostEvent = {
  /** The listing itself: the same shape as a row in the `events` table. */
  event: EventRow;
  /** How many vendors of each category the organizer will accept. 0 = none. */
  limits: Record<VendorCategory, number>;
  applicants: Applicant[];
  /** Year of the most recent past vendor list on file. null = none on file. */
  pastVendorListYear: number | null;
  /** null = no vendor reports yet. */
  ratings: RatingTotals | null;
  /** Share of last year's vendors who came back, 0-1. null = no history. */
  returningVendorRate: number | null;
  fitRanges: FitRange[];
  /** Median booth fee per attendee for events in the same county, in dollars. */
  countyMedianFeePerAttendee: number | null;
  activity: ListingActivity;
};

/** A message a vendor sent the organizer about one event. */
export type HostMessage = {
  id: string;
  /** `event.id` of the event the message is about. */
  eventId: string;
  vendor: string;
  /** ISO date the message arrived. */
  sentOn: string;
  body: string;
  unread: boolean;
};

/** Everything the dashboard shows for one organizer. */
export type HostAccount = {
  /** Made up (MASTER.md §6): the UI must label it "Sample". */
  isSample: true;
  organizer: string;
  events: HostEvent[];
  messages: HostMessage[];
};
