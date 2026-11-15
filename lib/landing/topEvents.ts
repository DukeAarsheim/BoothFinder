import { loadHostEvents } from "@/lib/host/loadEvents";
import { climateForEvent } from "@/lib/scoring/climateData";
import { projectEvent } from "@/lib/scoring/projection";
import type { BrandProfile } from "@/lib/types";
import { feeSummary, formatDateRange } from "@/lib/vendor/format";

/**
 * The example brand the landing page scores events for. Same numbers as the
 * Fit Calculator's starting values (DEFAULT_BRAND_PROFILE in
 * lib/vendor/storage.ts, which is client-only); keep the two in step.
 */
export const EXAMPLE_BRAND: BrandProfile = {
  price: 7,
  margin: 0.65,
  purchaseRate: 0.1,
  otherCosts: 250,
  productType: "cold",
};

export type TopEventRow = {
  id: string;
  name: string;
  /** "Oct 2 – Oct 3, 2027 · Morro Bay · $250–$450" */
  meta: string;
  /** Expected attendance, the popularity measure. */
  attendance: number;
  /** 0–100, or null when the listing lacks what the score needs. */
  fit: number | null;
  /** Base-scenario profit in dollars, or null when it can't be projected. */
  profit: number | null;
};

/**
 * The most popular upcoming real events, for the landing page's preview card.
 *
 * "Popular" = biggest expected attendance: the app doesn't track views or
 * saves on the server, so crowd size is the only popularity figure every
 * listing can have. Only published, non-sample listings that haven't ended
 * and that state an attendance are considered. Read live on every request.
 *
 * Returns [] when there is nothing to show (no database, or no such events).
 */
export async function loadTopEvents(limit = 3): Promise<TopEventRow[]> {
  const { events } = await loadHostEvents();
  const today = new Date().toISOString().slice(0, 10);

  return events
    .filter((e) => e.expected_attendance != null && (e.end_date ?? e.start_date ?? "") >= today)
    .sort((a, b) => b.expected_attendance! - a.expected_attendance! || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((e) => {
      const projection = projectEvent(e, EXAMPLE_BRAND, climateForEvent(e));
      const base = projection.scenarios.base;
      return {
        id: e.id,
        name: e.name,
        meta: [formatDateRange(e.start_date, e.end_date), e.city, feeSummary(e)?.value]
          .filter(Boolean)
          .join(" · "),
        attendance: e.expected_attendance!,
        fit: projection.fit ? Math.round(projection.fit.score) : null,
        profit: base.ok ? Math.round(base.netProfit) : null,
      };
    });
}
