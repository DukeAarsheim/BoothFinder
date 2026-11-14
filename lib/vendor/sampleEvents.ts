import type { EventRow } from "@/lib/types";

/**
 * MADE-UP events, shown ONLY when Supabase isn't configured (no .env.local), so
 * the dashboard can be built and tested without database keys. Every row has
 * is_sample = true and is labeled "Sample" in the UI (MASTER.md §6). They are
 * never shown when the database is connected, and never written to it.
 */
function sample(
  n: number,
  fields: Partial<EventRow> & Pick<EventRow, "name" | "event_type">,
): EventRow {
  return {
    id: `sample-${n}`,
    is_sample: true,
    created_via: "manual",
    created_at: "2026-11-14T00:00:00Z",
    updated_at: "2026-11-14T00:00:00Z",
    application_deadline: null,
    application_fee: null,
    apply_url: null,
    attendance_source: null,
    booth_fee_max: null,
    booth_fee_min: null,
    booth_size: null,
    city: null,
    county: null,
    day_type: null,
    electricity_fee: null,
    end_date: null,
    expected_attendance: null,
    fee_info_year: null,
    fee_notes: null,
    fee_pct_of_sales: null,
    how_to_apply: null,
    notes: null,
    schedule_notes: null,
    similar_vendor_limit: null,
    source_url: null,
    start_date: null,
    vendor_spots: null,
    venue: null,
    ...fields,
  };
}

const SLO = "San Luis Obispo";
const SB = "Santa Barbara";

export const SAMPLE_EVENTS: EventRow[] = [
  sample(1, { name: "Sample Downtown Evening Market", event_type: "market", city: "San Luis Obispo", county: SLO, start_date: "2027-04-08", day_type: "weekday", booth_fee_min: 60, booth_fee_max: 60, expected_attendance: 5000, application_deadline: "2027-03-15" }),
  sample(2, { name: "Sample Spring Street Fair", event_type: "street_fair", city: "San Luis Obispo", county: SLO, start_date: "2027-05-01", end_date: "2027-05-02", day_type: "weekend", booth_fee_min: 175, booth_fee_max: 350, expected_attendance: 12000, application_deadline: "2027-03-01" }),
  sample(3, { name: "Sample Campus 5K", event_type: "race", city: "San Luis Obispo", county: SLO, start_date: "2027-04-17", day_type: "weekend", booth_fee_min: 100, booth_fee_max: 100, expected_attendance: 1500 }),
  sample(4, { name: "Sample County Summer Fair", event_type: "fair", city: "Paso Robles", county: SLO, start_date: "2027-07-21", end_date: "2027-08-01", day_type: "mixed", booth_fee_min: 900, booth_fee_max: 2000, expected_attendance: 300000, application_deadline: "2027-02-01" }),
  sample(5, { name: "Sample Harbor Festival", event_type: "festival", city: "Morro Bay", county: SLO, start_date: "2027-10-02", end_date: "2027-10-03", day_type: "weekend", booth_fee_min: 250, booth_fee_max: 450, expected_attendance: 8000 }),
  sample(6, { name: "Sample Pier Half Marathon", event_type: "race", city: "Pismo Beach", county: SLO, start_date: "2027-05-22", day_type: "weekend", booth_fee_min: 150, booth_fee_max: 150, expected_attendance: 2500 }),
  sample(7, { name: "Sample Valley Farmers Market", event_type: "market", city: "Santa Maria", county: SB, start_date: "2027-04-14", day_type: "weekday", booth_fee_min: 45, booth_fee_max: 45 }),
  sample(8, { name: "Sample Danish Village Festival", event_type: "festival", city: "Solvang", county: SB, start_date: "2027-09-17", end_date: "2027-09-19", day_type: "weekend", booth_fee_min: 300, booth_fee_max: 600, expected_attendance: 15000, application_deadline: "2027-06-30" }),
  sample(9, { name: "Sample Waterfront Arts Market", event_type: "market", city: "Santa Barbara", county: SB, start_date: "2027-04-11", day_type: "weekend", booth_fee_min: 120, booth_fee_max: 120, expected_attendance: 4000 }),
  sample(10, { name: "Sample Summer Solstice Festival", event_type: "festival", city: "Santa Barbara", county: SB, start_date: "2027-06-19", end_date: "2027-06-20", day_type: "weekend", booth_fee_min: 500, booth_fee_max: 1200, expected_attendance: 60000, application_deadline: "2027-04-01" }),
  sample(11, { name: "Sample Avocado Street Fair", event_type: "street_fair", city: "Carpinteria", county: SB, start_date: "2027-10-08", end_date: "2027-10-10", day_type: "weekend", booth_fee_min: 400, booth_fee_max: 800, expected_attendance: 40000 }),
  sample(12, { name: "Sample Flower Fields Fair", event_type: "fair", city: "Lompoc", county: SB, start_date: "2027-06-23", end_date: "2027-06-27", day_type: "mixed", booth_fee_min: 200, booth_fee_max: 500 }),
];
