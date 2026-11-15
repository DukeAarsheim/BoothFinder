import data from "@/data/climate/monthly-highs.json";
import type { EventClimate } from "@/lib/scoring/projection";
import { eventMonth, nearestMonthlyHighs, type ClimatePoint } from "@/lib/scoring/climate";

const POINTS: readonly ClimatePoint[] = data.points;

/**
 * The month and typical monthly highs for an event, for projectEvent. The saved
 * data comes from scripts/fetch-climate.mjs (Open-Meteo, credited in MASTER.md).
 */
export function climateForEvent(event: {
  start_date: string | null;
  latitude: number | null;
  longitude: number | null;
  timing?: { kind: string; start?: string };
}): EventClimate {
  return {
    month: eventMonth(event),
    monthlyHighC: nearestMonthlyHighs(POINTS, event.latitude, event.longitude),
  };
}
