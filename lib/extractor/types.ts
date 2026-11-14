import type { EventType } from "@/lib/types";

/**
 * What the extractor pulls out of a vendor packet (PDF) or event web page.
 * Keys match columns of the `events` table. null = the source didn't say;
 * the extractor never fills a gap with a guess (MASTER.md §6).
 */
export type ExtractedEvent = {
  name: string | null;
  event_type: EventType | null;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  venue: string | null;
  city: string | null;
  application_deadline: string | null; // YYYY-MM-DD
  booth_fee_min: number | null;
  booth_fee_max: number | null;
  booth_size: string | null;
  electricity_fee: number | null;
  fee_pct_of_sales: number | null;
  expected_attendance: number | null;
  vendor_spots: number | null;
  apply_url: string | null;
};

export type ExtractedField = keyof ExtractedEvent;

/** Response of POST /api/extract. */
export type ExtractResponse = {
  fields: ExtractedEvent;
  /** Short quotes from the source that back a field, where the extractor has one. */
  evidence?: Partial<Record<ExtractedField, string>>;
};
