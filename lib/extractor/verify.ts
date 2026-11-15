/**
 * Source verification for extracted event facts. Pure: no network, no database.
 *
 * The model returns, for each field, a value plus a verbatim quote and which
 * document the quote is from. Nothing the model says is trusted on its own:
 *   1. the quote must actually appear in that document, and
 *   2. the value must be supported by the quote (the dollar figure, the day of
 *      the month, the words of the name are in it).
 * A field that fails either check is discarded and reported in `dropped`, so the
 * stored row holds only facts a reviewer can trace to the source (MASTER.md §6:
 * "Don't invent data").
 */
import type { EventType, EvidenceQuote, ExtractedEvent } from "@/lib/types";
import type { ExtractedEvent as HostEvent, ExtractedField, ExtractResponse } from "./types";

/** A document as the verifier needs it. `links` are absolute URLs found in it. */
export type VerifiableDoc = { url: string; text: string; links: string[] };

/** One field as the model returns it. `doc` is 1-based, matching the prompt. */
export type RawField = { value?: unknown; quote?: unknown; doc?: unknown } | null | undefined;

export type RawExtraction = {
  is_vendor_opportunity?: unknown;
  reason?: unknown;
  fields?: Record<string, RawField>;
};

export type VerifiedExtraction = {
  /** Null when the event name could not be verified; the candidate is then unusable. */
  event: ExtractedEvent | null;
  organizerName: string | null;
  evidence: Record<string, EvidenceQuote>;
  dropped: string[];
  /**
   * For each dropped field: what the model claimed, the quote it gave, and why
   * that wasn't accepted. Shown to reviewers so a missed fact can be checked by hand.
   */
  droppedDetail: Record<string, { claimed: string; quote: string; reason: string }>;
  hasPricing: boolean;
};

type FieldKind =
  | "literal" // the value's words must appear in the quote
  | "summary" // a paraphrase; the quote must exist in the source
  | "date"
  | "money"
  | "percent"
  | "count"
  | "year";

/** Every field the model may return, and how each is checked. */
export const FIELD_KINDS = {
  name: "literal",
  organizer_name: "literal",
  venue: "literal",
  city: "literal",
  county: "literal",
  start_date: "date",
  end_date: "date",
  application_deadline: "date",
  schedule_notes: "summary",
  how_to_apply: "summary",
  booth_fee_min: "money",
  booth_fee_max: "money",
  application_fee: "money",
  electricity_fee: "money",
  fee_pct_of_sales: "percent",
  fee_notes: "summary",
  fee_info_year: "year",
  booth_size: "summary",
  expected_attendance: "count",
  attendance_source: "summary",
  vendor_spots: "count",
  similar_vendor_limit: "summary",
  notes: "summary",
} as const satisfies Record<string, FieldKind>;

type FieldName = keyof typeof FIELD_KINDS;

const EVENT_TYPE_VALUES = [
  "fair",
  "race",
  "market",
  "festival",
  "street_fair",
  "other",
] as const satisfies readonly EventType[];

/**
 * A refundable deposit or reservation fee is money a vendor gets back, not the
 * price of the booth. A "booth fee" whose quote talks about one is rejected.
 */
const NOT_A_BOOTH_FEE = /refund|deposit|returned to (you|the vendor)/i;
/** "Vendors are paid 70% of sales" states the organizer's 30% share by subtraction. */
const VENDOR_SHARE = /\b(paid|pays?|keeps?|retains?|receives?|split)\b/i;

const MAX_QUOTE_CHARS = 400;
const MIN_QUOTE_CHARS = 6;
const MAX_TEXT_CHARS = 600;

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------

/** Lowercase, straighten quotes and dashes, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalized with all whitespace removed: PDFs and HTML break lines unpredictably. */
const squeeze = (s: string) => normalize(s).replace(/\s+/g, "");

const cleanQuote = (q: string) => q.replace(/^[\s.…"'“”]+|[\s.…"'“”]+$/g, "");

export function quoteInText(quote: string, text: string): boolean {
  const q = squeeze(cleanQuote(quote));
  return q.length >= MIN_QUOTE_CHARS && squeeze(text).includes(q);
}

/** Every number written in a piece of text: "1,250.50" → 1250.5, "10k" → 10000. */
export function numbersIn(text: string): number[] {
  const out: number[] = [];
  const re = /(\d[\d,]*(?:\.\d+)?)(\s*(?:k\b|thousand\b|million\b))?/gi;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    const unit = m[2]?.trim().toLowerCase();
    out.push(unit === "million" ? n * 1e6 : unit ? n * 1e3 : n);
  }
  return out;
}

const hasNumber = (text: string, value: number) =>
  numbersIn(text).some((n) => Math.abs(n - value) < 0.005);

const wordsOf = (s: string) => normalize(s).match(/[a-z0-9]+/g) ?? [];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value: unknown): { y: number; m: number; d: number } | null {
  if (typeof value !== "string") return null;
  const match = ISO_DATE.exec(value.trim());
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return real && y >= 2000 && y <= 2100 ? { y, m, d } : null;
}

/**
 * A date is supported when the quote names its day and month, and its year is
 * either in the quote or at least printed somewhere in the sources (pages often
 * say "June 5" under a "2027 Vendor Application" heading).
 */
function dateSupported(date: { y: number; m: number; d: number }, quote: string, docs: VerifiableDoc[]) {
  const q = normalize(quote);
  const nums = numbersIn(q);
  if (!nums.includes(date.d)) return false;

  const month = MONTHS[date.m - 1];
  const monthNamed = new RegExp(`\\b${month.slice(0, 3)}[a-z]*\\b`).test(q);
  const monthNumeric = new RegExp(`\\b0?${date.m}[/.-]0?${date.d}\\b`).test(q);
  if (!monthNamed && !monthNumeric) return false;

  const yearsInQuote = nums.filter((n) => Number.isInteger(n) && n >= 2000 && n <= 2100);
  if (yearsInQuote.length) return yearsInQuote.includes(date.y);
  // "6/5/27" style.
  if (new RegExp(`[/.-]${String(date.y).slice(2)}\\b`).test(q)) return true;
  return docs.some((doc) => doc.text.includes(String(date.y)));
}

// ---------------------------------------------------------------------------
// Per-field checks. Each returns the cleaned value, or null to drop the field.
// ---------------------------------------------------------------------------

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[$,%\s]/g, ""));
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

function checkValue(
  kind: FieldKind,
  value: unknown,
  quote: string,
  docs: VerifiableDoc[],
  field?: string,
): string | number | null {
  if (field?.startsWith("booth_fee_") && NOT_A_BOOTH_FEE.test(quote)) return null;
  switch (kind) {
    case "literal": {
      if (typeof value !== "string") return null;
      const text = value.trim().slice(0, MAX_TEXT_CHARS);
      const words = wordsOf(text);
      const quoteWords = new Set(wordsOf(quote));
      return words.length > 0 && words.every((w) => quoteWords.has(w)) ? text : null;
    }
    case "summary": {
      if (typeof value !== "string") return null;
      return value.trim().slice(0, MAX_TEXT_CHARS) || null;
    }
    case "date": {
      const date = parseIsoDate(value);
      return date && dateSupported(date, quote, docs) ? (value as string).trim() : null;
    }
    case "money": {
      const n = toNumber(value);
      if (n == null || n < 0 || n > 1_000_000) return null;
      // "free" / "no fee" back a zero; otherwise the figure itself must be quoted.
      if (n === 0) return /\b(free|no (booth |vendor |application )?(fee|charge|cost))\b/i.test(quote) ? 0 : null;
      return hasNumber(quote, n) ? Math.round(n * 100) / 100 : null;
    }
    case "percent": {
      const n = toNumber(value);
      if (n == null || n <= 0 || n > 100) return null;
      if (!/%|percent/i.test(quote)) return null;
      if (hasNumber(quote, n)) return n;
      return VENDOR_SHARE.test(quote) && hasNumber(quote, 100 - n) ? n : null;
    }
    case "count": {
      const n = toNumber(value);
      if (n == null || n < 0 || !Number.isInteger(n) || n > 50_000_000) return null;
      return hasNumber(quote, n) ? n : null;
    }
    case "year": {
      const n = toNumber(value);
      if (n == null || !Number.isInteger(n) || n < 2000 || n > 2100) return null;
      return hasNumber(quote, n) ? n : null;
    }
  }
}

/**
 * The organizer form uses the same evidence checks as discovery, but it can
 * still show other verified fields when the model couldn't find the name.
 * An unsupported value is removed, not merely stripped of its quote.
 */
export function verifyHostFields(
  input: HostEvent,
  rawQuotes: unknown,
  sourceText: string,
): ExtractResponse {
  const fields = { ...input };
  const evidence: NonNullable<ExtractResponse["evidence"]> = {};
  const quotes = rawQuotes && typeof rawQuotes === "object" ? rawQuotes as Record<string, unknown> : {};
  const docs: VerifiableDoc[] = [{ url: "", text: sourceText, links: [] }];
  for (const key of Object.keys(fields) as ExtractedField[]) {
    const value = fields[key];
    if (value == null) continue;
    const quote = typeof quotes[key] === "string" ? (quotes[key] as string).trim().slice(0, 160) : "";
    let supported = quoteInText(quote, sourceText);
    if (supported && key === "event_type") {
      const terms: Record<string, RegExp> = {
        fair: /\bfair\b/i, race: /\b(race|marathon|run)\b/i,
        market: /\bmarket\b/i, festival: /\bfestival\b/i,
        street_fair: /\bstreet\s+fair\b/i, other: /\b(event|vendor|exhibitor)\b/i,
      };
      supported = typeof value === "string" && Boolean(terms[value]?.test(quote));
    } else if (supported && key === "apply_url") {
      supported = typeof value === "string" && sourceText.includes(value) && quote.includes(value);
    } else if (supported && key === "booth_size") {
      const compact = (s: string) => normalize(s).replace(/\s+|feet|foot|ft|['′’]/g, "");
      supported = typeof value === "string" && Boolean(compact(value)) && compact(quote).includes(compact(value));
    } else if (supported && key === "fee_pct_of_sales" && value === 0) {
      supported = /\b0\s*%|\b0\s*percent\b|\bno (sales |revenue )?(cut|share|percentage)\b/i.test(quote);
    } else if (supported && (key === "booth_fee_min" || key === "booth_fee_max" || key === "electricity_fee") && typeof value === "number" && value > 0) {
      // A year or an attendance count in the same quote is not a dollar amount.
      const amounts = quote.match(/(?:\$\s*|\bUSD\s*)\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s*(?:dollars|USD)\b/gi) ?? [];
      supported = amounts.some((amount) => numbersIn(amount).some((n) => Math.abs(n - value) < 0.005)) &&
        checkValue(FIELD_KINDS[key], value, quote, docs, key) != null;
    } else if (supported && key in FIELD_KINDS) {
      const field = key as FieldName;
      supported = checkValue(FIELD_KINDS[field], value, quote, docs, field) != null;
    } else if (supported) {
      supported = false;
    }
    if (supported) evidence[key] = quote;
    else Object.assign(fields, { [key]: null });
  }
  return { fields, evidence };
}

/** weekday | weekend | mixed, computed from the verified dates rather than asked of the model. */
export function dayTypeFor(start: string | null, end: string | null): "weekday" | "weekend" | "mixed" | null {
  const from = parseIsoDate(start);
  if (!from) return null;
  const to = parseIsoDate(end) ?? from;
  const first = Date.UTC(from.y, from.m - 1, from.d);
  const last = Math.max(first, Date.UTC(to.y, to.m - 1, to.d));
  let weekend = 0;
  let weekday = 0;
  // Long seasons (a market that runs April to October) are both by definition.
  for (let t = first, i = 0; t <= last && i < 62; t += 86_400_000, i++) {
    const dow = new Date(t).getUTCDay();
    if (dow === 0 || dow === 6) weekend++;
    else weekday++;
  }
  if (weekend && weekday) return "mixed";
  return weekend ? "weekend" : "weekday";
}

// ---------------------------------------------------------------------------
// The whole extraction
// ---------------------------------------------------------------------------

/** Fields that need no quote are sometimes returned as a bare value instead of { value }. */
const plain = (entry: unknown): unknown =>
  entry && typeof entry === "object" ? (entry as { value?: unknown }).value : entry;

export function verifyExtraction(raw: RawExtraction, docs: VerifiableDoc[]): VerifiedExtraction {
  const fields = raw.fields && typeof raw.fields === "object" ? raw.fields : {};
  const values: Partial<Record<FieldName, string | number>> = {};
  const evidence: Record<string, EvidenceQuote> = {};
  const dropped: string[] = [];
  const droppedDetail: VerifiedExtraction["droppedDetail"] = {};

  // The organizer is checked first, because a listing's name may borrow its words (below).
  const order = Object.keys(FIELD_KINDS) as FieldName[];
  order.sort((a, b) => Number(b === "organizer_name") - Number(a === "organizer_name"));

  for (const field of order) {
    const entry = fields[field];
    if (!entry || entry.value == null || entry.value === "") continue;

    const quote = typeof entry.quote === "string" ? cleanQuote(entry.quote).slice(0, MAX_QUOTE_CHARS) : "";
    const index = typeof entry.doc === "number" ? entry.doc - 1 : 0;
    // The model may misnumber the document; accept the quote from whichever one holds it.
    const doc = [docs[index], ...docs].find((d) => d && quoteInText(quote, d.text));
    // An application that covers several events is named for who runs it plus its
    // title ("Cordova Community Council Food Vendor Opportunities"), so the name
    // may use the verified organizer's words as well as its own quote.
    const support = field === "name" && values.organizer_name ? `${quote} ${values.organizer_name}` : quote;
    let value = doc ? checkValue(FIELD_KINDS[field], entry.value, support, docs, field) : null;
    // Stored without the suffix; the app adds "County" when it shows one.
    if (field === "county" && typeof value === "string") {
      value = value.replace(/\s+county$/i, "").trim() || null;
    }

    if (!doc || value == null) {
      dropped.push(field);
      droppedDetail[field] = {
        claimed: String(entry.value).slice(0, 200),
        quote: quote.slice(0, 300),
        reason: !quote
          ? "The AI gave no quote for it."
          : !doc
            ? "The quoted words aren't in the source."
            : "The quote doesn't state this value.",
      };
      continue;
    }
    values[field] = value;
    evidence[field] = { quote, url: doc.url };
  }

  // A single fee fills both ends of the range (the events schema expects that).
  const copy = (to: FieldName, from: FieldName) => {
    if (values[to] == null && values[from] != null) {
      values[to] = values[from];
      evidence[to] = evidence[from];
    }
  };
  copy("booth_fee_max", "booth_fee_min");
  copy("booth_fee_min", "booth_fee_max");
  if ((values.booth_fee_min as number) > (values.booth_fee_max as number)) {
    [values.booth_fee_min, values.booth_fee_max] = [values.booth_fee_max, values.booth_fee_min];
    [evidence.booth_fee_min, evidence.booth_fee_max] = [evidence.booth_fee_max, evidence.booth_fee_min];
  }
  // Dates must be in order, or the events table rejects the row.
  if (values.start_date && values.end_date && values.end_date < values.start_date) {
    delete values.end_date;
    delete evidence.end_date;
    dropped.push("end_date");
  }
  if (values.end_date && !values.start_date) {
    delete values.end_date;
    delete evidence.end_date;
    dropped.push("end_date");
  }

  // apply_url is checked against the links actually present in the sources.
  let applyUrl: string | null = null;
  const rawApply = plain(fields.apply_url);
  if (typeof rawApply === "string" && rawApply.trim()) {
    const wanted = rawApply.trim().replace(/\/+$/, "");
    const known = docs.flatMap((d) => [d.url, ...d.links]);
    applyUrl = known.find((u) => u.replace(/\/+$/, "") === wanted) ?? null;
    if (!applyUrl) dropped.push("apply_url");
  }

  // event_type is a classification, not a quoted fact; an unknown value becomes "other".
  const rawType = plain(fields.event_type);
  const eventType = EVENT_TYPE_VALUES.find((t) => t === rawType) ?? "other";

  const str = (f: FieldName) => (values[f] as string | undefined) ?? null;
  const num = (f: FieldName) => (values[f] as number | undefined) ?? null;
  const name = str("name");

  const event: ExtractedEvent | null = name
    ? {
        name,
        event_type: eventType,
        start_date: str("start_date"),
        end_date: str("end_date"),
        day_type: dayTypeFor(str("start_date"), str("end_date")),
        schedule_notes: str("schedule_notes"),
        venue: str("venue"),
        city: str("city"),
        county: str("county"),
        source_url: docs[0]?.url ?? null,
        apply_url: applyUrl,
        how_to_apply: str("how_to_apply"),
        application_deadline: str("application_deadline"),
        booth_fee_min: num("booth_fee_min"),
        booth_fee_max: num("booth_fee_max"),
        fee_pct_of_sales: num("fee_pct_of_sales"),
        application_fee: num("application_fee"),
        electricity_fee: num("electricity_fee"),
        fee_notes: str("fee_notes"),
        fee_info_year: num("fee_info_year"),
        booth_size: str("booth_size"),
        expected_attendance: num("expected_attendance"),
        attendance_source: num("expected_attendance") != null ? str("attendance_source") : null,
        vendor_spots: num("vendor_spots"),
        similar_vendor_limit: str("similar_vendor_limit"),
        notes: str("notes"),
      }
    : null;

  return {
    event,
    organizerName: str("organizer_name"),
    evidence,
    dropped,
    droppedDetail,
    hasPricing: num("booth_fee_min") != null || num("fee_pct_of_sales") != null,
  };
}
