/**
 * The applicant list an organizer downloads from the dashboard, as CSV text.
 * Pure functions: the browser download itself lives in the component.
 *
 * Type-only imports on purpose: see metrics.ts.
 */
import type { HostEvent } from "./types";

const COLUMNS = ["Event", "Vendor", "Category", "Product", "Status", "Applied", "Sample"];

/**
 * One CSV cell.
 * - A value a spreadsheet would run as a formula (it starts with =, +, - or @)
 *   gets a leading apostrophe, which spreadsheets treat as "this is text".
 *   Vendor names are typed in by vendors, so this matters once the data is real.
 * - A value with a comma, a quote or a line break is wrapped in quotes, with
 *   quotes inside it doubled (RFC 4180).
 */
function cell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * Every applicant to one event, one row each, under a header row. The last
 * column says whether the event is made up, so an exported sample list can't be
 * mistaken for real data (MASTER.md §6).
 */
export function applicantsCsv(hostEvent: Pick<HostEvent, "event" | "applicants">): string {
  const { event, applicants } = hostEvent;
  const sample = event.is_sample ? "yes" : "no";
  const rows = applicants.map((a) => [
    event.name,
    a.vendor,
    a.category,
    a.product,
    a.status,
    a.appliedOn,
    sample,
  ]);
  return [COLUMNS, ...rows].map((row) => `${row.map(cell).join(",")}\r\n`).join("");
}

/** "Harvest on the Plaza" -> "harvest-on-the-plaza-applicants.csv". */
export function csvFileName(eventName: string): string {
  const slug = eventName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // drop accents: "Señor" -> "Senor"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "event"}-applicants.csv`;
}
