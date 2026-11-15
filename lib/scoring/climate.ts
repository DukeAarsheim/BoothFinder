// Finds the typical monthly highs for an event. Pure functions (no imports) so
// the tests can load this file straight into Node. The saved data is wired in by
// climateData.ts.

export interface ClimatePoint {
  lat: number;
  lng: number;
  /** Average daily high (°C) for January … December. */
  highC: readonly number[];
}

/** Farthest a saved point may be from an event and still stand in for it (~150 km). */
export const MAX_CLIMATE_DISTANCE_KM = 150;

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Monthly highs of the closest saved point within range, or null. */
export function nearestMonthlyHighs(
  points: readonly ClimatePoint[],
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): readonly number[] | null {
  if (latitude == null || longitude == null) return null;
  let best: ClimatePoint | null = null;
  let bestKm = Infinity;
  for (const p of points) {
    const km = distanceKm(latitude, longitude, p.lat, p.lng);
    if (km < bestKm) {
      best = p;
      bestKm = km;
    }
  }
  return best && bestKm <= MAX_CLIMATE_DISTANCE_KM ? best.highC : null;
}

/**
 * The month an event starts (1–12): its own start date, else the start of the
 * "expected" window the finder works out from last year's dates.
 */
export function eventMonth(event: {
  start_date: string | null;
  timing?: { kind: string; start?: string };
}): number | null {
  const day =
    event.start_date ?? (event.timing && "start" in event.timing ? (event.timing.start ?? null) : null);
  if (!day || !/^\d{4}-\d{2}-\d{2}/.test(day)) return null;
  const m = Number(day.slice(5, 7));
  return m >= 1 && m <= 12 ? m : null;
}
