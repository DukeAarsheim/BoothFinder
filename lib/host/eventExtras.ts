/**
 * The listing details an organizer types in by hand on the add-event screen
 * that the AI extractor does not read (lib/extractor/types.ts lists the ones it
 * does). Keys match columns of the `events` table.
 *
 * Pure and import-free on purpose: the tests load this file with plain Node
 * (node --test "lib/host/*.test.mjs").
 */
export type EventExtras = {
  county: string | null;
  attendance_source: string | null;
  application_fee: number | null;
  similar_vendor_limit: string | null;
  notes: string | null;
};

export type ExtraField = keyof EventExtras;

const scalar = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : null;

/** One line of text: trimmed, spaces collapsed, cut to `max`. Blank becomes null. */
const line = (value: unknown, max: number) => {
  const text = scalar(value)?.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : null;
};

/**
 * Turns untrusted form values into valid extras. Anything blank, malformed or
 * out of range becomes null: a blank field is honest, a wrong one is not.
 * Runs in the browser and again on the server before saving.
 */
export function cleanExtras(raw: unknown): EventExtras {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  // The site shows "<county> County", so store the bare name.
  const county = line(r.county, 200)?.replace(/\s+county$/i, "").slice(0, 100) || null;

  const feeText = scalar(r.application_fee)?.replace(/[$,\s]/g, "") ?? "";
  const fee = feeText === "" ? Number.NaN : Number(feeText);
  // $0 is a real answer ("no application fee"), so only null means unknown.
  const application_fee = Number.isFinite(fee) && fee >= 0 && fee <= 100_000 ? fee : null;

  // Notes keep their line breaks.
  const notes = scalar(r.notes)?.trim().slice(0, 2000) || null;

  return {
    county,
    attendance_source: line(r.attendance_source, 200),
    application_fee,
    similar_vendor_limit: line(r.similar_vendor_limit, 200),
    notes,
  };
}

/**
 * How the listing was made, for the `created_via` column. "extractor" only
 * when the form says a file, link or pasted text was read; anything else is a
 * listing typed in by hand.
 */
export function createdVia(value: unknown): "manual" | "extractor" {
  return value === "extractor" ? "extractor" : "manual";
}
