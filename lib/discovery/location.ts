/**
 * Does a source say its event is in California? Pure.
 *
 * The geocoder can't answer this alone: we ask it for "<city>, California", so
 * it will happily find a California place with the same name as a town in
 * another state. The page's own words have to agree.
 */

/** ", CA 93940" style: a state abbreviation followed by a ZIP code. */
const STATE_AND_ZIP = /,\s*([A-Z]{2})\.?\s+\d{5}\b/g;

/**
 * "yes"      the sources name California (or give a CA address)
 * "no"       every address in the sources is in another state
 * "unstated" the sources don't say
 */
export function californiaEvidence(texts: string[]): "yes" | "no" | "unstated" {
  const states = texts.flatMap((text) => [...text.matchAll(STATE_AND_ZIP)].map((m) => m[1]));
  if (states.includes("CA")) return "yes";
  if (texts.some((text) => /\bCalifornia\b|,\s*CA\b/.test(text))) return "yes";
  return states.length > 0 ? "no" : "unstated";
}
