import "server-only";

/**
 * The Mapbox public token, read on the server and handed to the map as a prop.
 * Vercel holds it as MAPBOX_TOKEN; NEXT_PUBLIC_MAPBOX_TOKEN also works locally.
 * Only public tokens ("pk.") are passed on: a secret token ("sk.") must never
 * reach the browser, so it is treated as "no token" and the Leaflet map shows.
 */
export function getMapboxToken(): string | null {
  const token = (process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "").trim();
  return token.startsWith("pk.") ? token : null;
}
