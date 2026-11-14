import type { EventRow } from "@/lib/types";

/**
 * The events table has no latitude/longitude, so the map places each event at
 * its city (or, failing that, its county seat). Pins are city-level, not
 * venue-level. If the schema gains coordinates later, read them in
 * `locateEvents` and fall back to this table.
 */
export type LatLng = [lat: number, lng: number];

/** Default map view: San Luis Obispo and Santa Barbara counties. */
export const REGION_BOUNDS: [LatLng, LatLng] = [
  [34.35, -121.35],
  [35.8, -119.45],
];

const CITY_COORDS: Record<string, LatLng> = {
  // San Luis Obispo County
  "san luis obispo": [35.2828, -120.6596],
  "paso robles": [35.6266, -120.691],
  atascadero: [35.4894, -120.6707],
  templeton: [35.5497, -120.706],
  "san miguel": [35.7525, -120.6963],
  "santa margarita": [35.39, -120.6091],
  "morro bay": [35.3658, -120.8499],
  cayucos: [35.4428, -120.8921],
  cambria: [35.5641, -121.0808],
  "los osos": [35.3111, -120.8324],
  "avila beach": [35.18, -120.7319],
  "pismo beach": [35.1428, -120.6413],
  "grover beach": [35.1216, -120.6213],
  "arroyo grande": [35.1186, -120.5907],
  oceano: [35.0989, -120.6124],
  nipomo: [35.0428, -120.476],
  // Santa Barbara County
  "santa maria": [34.953, -120.4357],
  orcutt: [34.8653, -120.436],
  guadalupe: [34.9716, -120.5718],
  lompoc: [34.6391, -120.4579],
  "los alamos": [34.7444, -120.2782],
  buellton: [34.6136, -120.1927],
  solvang: [34.5958, -120.1376],
  "santa ynez": [34.6144, -120.0799],
  "los olivos": [34.6678, -120.1149],
  goleta: [34.4358, -119.8276],
  "isla vista": [34.4133, -119.861],
  "santa barbara": [34.4208, -119.6982],
  montecito: [34.4367, -119.6321],
  carpinteria: [34.3989, -119.5185],
};

/** County seats, used when an event has a county but no recognized city. */
const COUNTY_COORDS: Record<string, LatLng> = {
  "san luis obispo": CITY_COORDS["san luis obispo"],
  "santa barbara": CITY_COORDS["santa barbara"],
};

const clean = (s: string | null) =>
  (s ?? "")
    .toLowerCase()
    .replace(/,\s*ca(lifornia)?\.?$/i, "")
    .replace(/\s+county$/, "")
    .trim();

export type LocatedEvent = {
  event: EventRow;
  position: LatLng;
  /** How the pin was placed. "county" pins are rough. */
  precision: "city" | "county";
};

/**
 * Gives every event it can a map position. Events that share a city are fanned
 * out in a small spiral so their pins don't stack on one point.
 */
export function locateEvents(events: EventRow[]): LocatedEvent[] {
  const seen = new Map<string, number>();
  const located: LocatedEvent[] = [];

  for (const event of events) {
    const city = CITY_COORDS[clean(event.city)];
    const base = city ?? COUNTY_COORDS[clean(event.county)];
    if (!base) continue;

    const key = base.join(",");
    const i = seen.get(key) ?? 0;
    seen.set(key, i + 1);

    // Golden-angle spiral: the first event sits on the city, the rest ring it (~0.7 km steps).
    const r = 0.0065 * Math.sqrt(i);
    const a = i * 2.39996;
    located.push({
      event,
      position: [base[0] + r * Math.sin(a), base[1] + (r * Math.cos(a)) / 0.82],
      precision: city ? "city" : "county",
    });
  }
  return located;
}
