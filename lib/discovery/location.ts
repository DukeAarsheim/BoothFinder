/**
 * Is an event in California? Pure. Boothfinder lists California events only, so
 * this is a hard gate: when the sources don't prove it, the answer is not "yes".
 *
 * The geocoder can't decide this. We ask it for "<city>, California", so it
 * finds a California street or hamlet with the same name as a town in any other
 * state. And the word "California" appearing somewhere on a page proves nothing
 * (California Avenue, "shipped from California"). What counts is the source
 * tying the event's OWN city or county to California: "Monterey, CA 93940",
 * "Paso Robles, California", "Kern County, California".
 */

const OTHER_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida",
  GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  // Canada: its web addresses end in ".ca", which is easy to mistake for California.
  ON: "Ontario", QC: "Quebec", BC: "British Columbia", AB: "Alberta", MB: "Manitoba",
  SK: "Saskatchewan", NS: "Nova Scotia", NB: "New Brunswick",
};
/** Country endings of sites that are never about a California event. ".ca" is Canada. */
const FOREIGN_SITE = /\.(ca|uk|au|nz|ie|in|za)$/i;
/** A Canadian postal code, e.g. "K8N 2Z2". */
const CANADIAN_POSTCODE = /\b[A-Z]\d[A-Z] ?\d[A-Z]\d\b/;

// What may follow a place name. Abbreviations need the comma ("Salem, OR"), or
// ordinary words like "in" and "or" would count; full names don't.
const THEN_CALIFORNIA = /^\s*,?\s*(CA\b|Calif\b|California\b)/;
const THEN_OTHER_STATE = new RegExp(
  `^\\s*(,\\s*(${Object.keys(OTHER_STATES).join("|")})\\b|,?\\s*(${Object.values(OTHER_STATES).join("|")})\\b)`,
);
/** ", IL 62220" style: a state abbreviation followed by a ZIP code. */
const STATE_AND_ZIP = /,\s*([A-Z]{2})\.?\s+\d{5}\b/g;

/**
 * California counties whose names no other state uses for a county. The nine
 * shared names (Butte, Humboldt, Kings, Lake, Nevada, Orange, Santa Cruz,
 * Sierra, Trinity) are left out on purpose: they prove nothing on their own.
 */
const ONLY_IN_CALIFORNIA = [
  "Alameda", "Alpine", "Amador", "Calaveras", "Colusa", "Contra Costa", "Del Norte",
  "El Dorado", "Fresno", "Glenn", "Imperial", "Inyo", "Kern", "Lassen", "Los Angeles",
  "Madera", "Marin", "Mariposa", "Mendocino", "Merced", "Modoc", "Mono", "Monterey",
  "Napa", "Placer", "Plumas", "Riverside", "Sacramento", "San Benito", "San Bernardino",
  "San Diego", "San Francisco", "San Joaquin", "San Luis Obispo", "San Mateo",
  "Santa Barbara", "Santa Clara", "Shasta", "Siskiyou", "Solano", "Sonoma", "Stanislaus",
  "Sutter", "Tehama", "Tulare", "Tuolumne", "Ventura", "Yolo", "Yuba",
].join("|");
/** "Sacramento County ..." or "County of Sacramento". */
const CALIFORNIA_ONLY_COUNTY = new RegExp(
  `\\b(${ONLY_IN_CALIFORNIA}) County\\b|\\bCounty of (${ONLY_IN_CALIFORNIA})\\b`,
);
/** Permits and codes that only apply to selling in California. */
const CALIFORNIA_RULES =
  /\bCalifornia (State )?(Seller['’]?s Permit|Resale (Permit|Certificate)|Retail Food Code|Health (and|&) Safety Code)\b|\bCDTFA\b|\bCalCode\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What the text says right after each mention of `place`. */
function statesAfter(place: string, text: string): { california: boolean; other: boolean } {
  const found = { california: false, other: false };
  const mention = new RegExp(`\\b${escape(place)}\\b`, "gi");
  for (let m = mention.exec(text); m; m = mention.exec(text)) {
    const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    if (THEN_CALIFORNIA.test(rest)) found.california = true;
    else if (THEN_OTHER_STATE.test(rest)) found.other = true;
  }
  return found;
}

export type CaliforniaVerdict = {
  /** "yes" = proven by the source. "no" = another state. "unstated" = not proven either way. */
  verdict: "yes" | "no" | "unstated";
  /** Plain-English reason, shown to reviewers. */
  reason: string;
};

export function californiaVerdict(input: {
  city: string | null;
  county: string | null;
  /** Text of every document read for the event. */
  texts: string[];
  /** Hostname of the source page. */
  host: string;
}): CaliforniaVerdict {
  const text = input.texts.join("\n");
  const city = input.city?.trim() || null;
  const county = input.county?.replace(/\s+county$/i, "").trim() || null;

  if (FOREIGN_SITE.test(input.host)) {
    return { verdict: "no", reason: `The source (${input.host}) is not a United States site.` };
  }

  if (city) {
    const after = statesAfter(city, text);
    if (after.california) return { verdict: "yes", reason: `The source places ${city} in California.` };
    if (after.other) return { verdict: "no", reason: `The source places ${city} in another state.` };
  }
  if (county && statesAfter(`${county} County`, text).california) {
    return { verdict: "yes", reason: `The source places ${county} County in California.` };
  }

  // Addresses elsewhere on the page: all in other states means it isn't ours.
  const zipStates = [...text.matchAll(STATE_AND_ZIP)].map((m) => m[1]);
  const elsewhere = zipStates.filter((s) => s in OTHER_STATES);
  if (elsewhere.length > 0 && !zipStates.includes("CA")) {
    return { verdict: "no", reason: `The source's addresses are in ${OTHER_STATES[elsewhere[0]]}.` };
  }

  if (CANADIAN_POSTCODE.test(text) && !zipStates.includes("CA")) {
    return { verdict: "no", reason: "The source gives a Canadian address." };
  }

  // A county that exists only in California ("Sacramento County Health Department").
  const named = CALIFORNIA_ONLY_COUNTY.exec(text);
  if (named) {
    return {
      verdict: "yes",
      reason: `The source refers to ${named[1] ?? named[2]} County, which is only in California.`,
    };
  }

  // Rules only a California event asks vendors to follow.
  const rule = CALIFORNIA_RULES.exec(text);
  if (rule) return { verdict: "yes", reason: `The source asks vendors for a "${rule[0]}".` };

  // California's own government sites only publish California events.
  if (/(^|\.)ca\.gov$/i.test(input.host)) {
    return { verdict: "yes", reason: "The source is a California government site." };
  }

  return {
    verdict: "unstated",
    reason: city
      ? `The source never says which state ${city} is in.`
      : "The source doesn't name the event's city.",
  };
}

/** Rough outline of California. A pin outside it is never a California event. */
export function insideCalifornia(latitude: number, longitude: number): boolean {
  return latitude >= 32.4 && latitude <= 42.1 && longitude >= -124.6 && longitude <= -114.0;
}
