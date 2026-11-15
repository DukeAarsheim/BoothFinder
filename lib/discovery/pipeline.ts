import "server-only";

import { extractFromDocuments } from "@/lib/extractor/extractDocuments";
import { SourceFetchError, fetchDocument, type FetchedDocument } from "@/lib/extractor/fetchSource";
import { AiRateLimitError, isAiConfigured } from "@/lib/extractor/llm";
import type { VendorOpportunityRow } from "@/lib/types";
import {
  APPLY_SIGNAL,
  BLOCKED_DOMAINS,
  DISCOVERY_LIMITS,
  NOT_VENDOR_LINK,
  PRICING_LINK_SIGNAL,
  RELATED_LINK_SIGNAL,
  VENDOR_SIGNAL,
} from "./config";
import { geocodeEvent } from "./geocode";
import { californiaEvidence } from "./location";
import { QUERY_COUNT, canonicalUrl, hostMatches, queriesForRun, seasonYear } from "./queries";
import { isSearchConfigured, searchWeb } from "./search";
import {
  finishRun,
  deleteUnapprovedOpportunity,
  insertOpportunity,
  knownSourceUrls,
  lastRun,
  startRun,
} from "./store";

/**
 * The discovery pipeline:
 *   search → skip known and blocked pages → fetch (robots.txt respected) →
 *   keyword pre-check → read linked applications / fee sheets → AI extraction →
 *   source verification → California check + geocode → save as `pending`.
 * Nothing here writes to `events`; that only happens on approval (./approve.ts).
 */

export type IngestOutcome =
  | { saved: true; opportunity: VendorOpportunityRow }
  | { saved: false; reason: string };

const isBlocked = (url: string) => {
  const host = new URL(url).hostname;
  return BLOCKED_DOMAINS.some((domain) => hostMatches(host, domain));
};

/**
 * Organizers often keep the vendor handbook or fee sheet in Google Docs or Drive.
 * Returns the address that serves such a document as plain text or PDF, or the
 * link unchanged for an ordinary page. Only publicly shared documents can be read.
 */
export function readableUrl(href: string): string {
  const url = new URL(href);
  if (url.hostname === "docs.google.com") {
    const id = /^\/document\/(?:u\/\d+\/)?d\/([\w-]{20,})/.exec(url.pathname)?.[1];
    if (id) return `https://docs.google.com/document/d/${id}/export?format=txt`;
  }
  if (url.hostname === "drive.google.com") {
    const id = /^\/file\/d\/([\w-]{20,})/.exec(url.pathname)?.[1] ?? url.searchParams.get("id");
    if (id && /^[\w-]{20,}$/.test(id)) return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  return href;
}

/**
 * Documents linked from the page that are likely to hold the vendor terms:
 * handbooks, packets, and fee sheets first, then other vendor pages. Follows
 * PDFs and Google Docs anywhere, and ordinary pages on the same site only.
 */
function relatedLinks(page: FetchedDocument): string[] {
  const pageUrl = new URL(page.url);
  const scored = new Map<string, number>();
  for (const link of page.links) {
    const href = canonicalUrl(link.href);
    if (!href || href === page.url || isBlocked(href)) continue;
    const url = new URL(href);
    if (/\.(jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|ics|mp4)$/i.test(url.pathname)) continue;
    const label = `${link.text} ${url.pathname}`;
    if (!RELATED_LINK_SIGNAL.test(label) || NOT_VENDOR_LINK.test(label)) continue;

    const isDocument = /\.pdf$/i.test(url.pathname) || readableUrl(href) !== href;
    if (!isDocument && url.hostname !== pageUrl.hostname) continue;
    const score =
      (PRICING_LINK_SIGNAL.test(link.text) ? 4 : 0) +
      (isDocument ? 2 : 0) +
      (/vendor|exhibitor|booth/i.test(link.text) ? 1 : 0);
    scored.set(href, Math.max(score, scored.get(href) ?? 0));
  }
  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, DISCOVERY_LIMITS.relatedDocsPerPage)
    .map(([href]) => href);
}

/**
 * Reads one page and, if it is a California vendor opportunity with a verified
 * name, saves it to the review queue. Expected "no" answers come back as a
 * reason; only unexpected failures throw.
 */
export async function ingestUrl(
  input: string,
  via: { discovered_via: "search" | "manual"; discovery_query: string | null },
): Promise<IngestOutcome> {
  const url = canonicalUrl(input);
  if (!url) return { saved: false, reason: "Not a valid web address." };
  if (isBlocked(url)) return { saved: false, reason: "That site is on the do-not-read list." };
  // A person re-submitting a page means "read it again"; search never re-reads.
  if (via.discovered_via === "manual") await deleteUnapprovedOpportunity(url);
  if ((await knownSourceUrls([url])).has(url)) {
    return { saved: false, reason: "That page is already in the queue or already an event." };
  }

  let page: FetchedDocument;
  try {
    const readable = readableUrl(url);
    // For a Google Doc, keep the link a person would open; otherwise use the address after redirects.
    page = readable === url ? await fetchDocument(url) : { ...(await fetchDocument(readable)), url };
  } catch (error) {
    if (error instanceof SourceFetchError) return { saved: false, reason: error.message };
    throw error;
  }
  // The page may have redirected (a trailing slash, www); entries are stored under the final address.
  if (page.url !== url) {
    if (via.discovered_via === "manual") await deleteUnapprovedOpportunity(page.url);
    if ((await knownSourceUrls([page.url])).has(page.url)) {
      return { saved: false, reason: "That page is already in the queue or already an event." };
    }
  }
  if (!VENDOR_SIGNAL.test(page.text) || !APPLY_SIGNAL.test(page.text)) {
    return { saved: false, reason: "The page doesn't mention vendor applications or fees." };
  }

  const docs = [page];
  for (const href of relatedLinks(page)) {
    try {
      // Keep the organizer's own link as the document's address, so evidence links open the real document.
      const doc = { ...(await fetchDocument(readableUrl(href))), url: href };
      if (!docs.some((d) => d.contentHash === doc.contentHash)) docs.push(doc);
    } catch (error) {
      if (!(error instanceof SourceFetchError)) throw error;
    }
  }

  const result = await extractFromDocuments(docs);
  if (!result.isVendorOpportunity) {
    return { saved: false, reason: `Not a vendor opportunity${result.reason ? `: ${result.reason}` : "."}` };
  }
  if (!result.event) {
    return { saved: false, reason: "The event name couldn't be verified against the page." };
  }

  // Last year's packet is still online for many events; a past edition isn't an opportunity.
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = result.event.end_date ?? result.event.start_date;
  if (lastDay && lastDay < today) {
    return { saved: false, reason: `That edition has already happened: it ended ${lastDay}.` };
  }

  // Applications that closed, for an event with no upcoming date, aren't open opportunities.
  const deadline = result.event.application_deadline;
  if (deadline && deadline < today && !(result.event.start_date && result.event.start_date >= today)) {
    return { saved: false, reason: `Applications have closed: the deadline was ${deadline}.` };
  }

  // California only. The page itself must say so: we ask the geocoder for
  // "<city>, California", so it finds a same-named California place for a town
  // in any state. A venue found in California is the one exception.
  const event = { ...result.event };
  const evidence = { ...result.evidence };
  const stated = californiaEvidence(docs.map((d) => d.text));
  const geo =
    stated === "no"
      ? null
      : await geocodeEvent({
          venue: event.venue ?? null,
          city: event.city ?? null,
          county: event.county ?? null,
        });
  const inCalifornia =
    stated === "yes"
      ? !geo || geo.state === "California"
      : stated === "unstated" && geo?.precision === "venue" && geo.state === "California";
  if (!inCalifornia) {
    return { saved: false, reason: "The event doesn't appear to be in California." };
  }
  if (!event.county && geo?.county) {
    event.county = geo.county;
    // Not a quote from the organizer: say so, so a reviewer isn't misled.
    evidence.county = {
      quote: `Not stated on the page. Looked up from "${event.city}, California".`,
      url: "https://www.openstreetmap.org/copyright",
    };
  }

  const opportunity = await insertOpportunity({
    source_url: page.url,
    source_domain: new URL(page.url).hostname.replace(/^www\./, ""),
    source_title: page.title,
    source_documents: docs.map((d) => ({
      url: d.url,
      kind: d.kind,
      title: d.title,
      content_hash: d.contentHash,
    })),
    discovered_via: via.discovered_via,
    discovery_query: via.discovery_query,
    content_hash: page.contentHash,
    name: event.name,
    organizer_name: result.organizerName,
    extracted: event,
    evidence,
    dropped_fields: result.dropped,
    has_pricing: result.hasPricing,
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    // The column only knows venue and city; a county-level pin is stored without a precision.
    geo_precision: geo && geo.precision !== "county" ? geo.precision : null,
  });
  return opportunity
    ? { saved: true, opportunity }
    : { saved: false, reason: "That page is already in the queue." };
}

export type RunStats = {
  queries: number;
  results: number;
  alreadyKnown: number;
  pagesRead: number;
  saved: number;
  savedWithPricing: number;
  skipped: Record<string, number>;
  /** What happened to each page read, so a run that queues nothing can be explained. */
  pages: { url: string; result: string }[];
  errors: string[];
  stoppedEarly: boolean;
};

/**
 * How promising a search result looks before it is read, from its title, snippet
 * and address. Only the best pages fit in one run, so they are read first.
 */
export function promise(hit: { url: string; title: string | null; snippet: string | null }, year: number): number {
  const text = `${hit.title ?? ""} ${hit.snippet ?? ""}`;
  const urlYears = (hit.url.match(/20\d\d/g) ?? []).map(Number);
  const stale = urlYears.length > 0 && urlYears.every((y) => y < year - 1);
  return (
    (VENDOR_SIGNAL.test(text) ? 2 : 0) +
    (APPLY_SIGNAL.test(text) ? 1 : 0) +
    (/\$\s?\d/.test(text) ? 2 : 0) +
    (/vendor|exhibitor|booth|concession/i.test(hit.url) ? 1 : 0) +
    (text.includes(String(year)) ? 1 : 0) -
    // An old year in the address usually means an old packet.
    (stale ? 3 : 0)
  );
}

/** One scheduled or manual discovery run. Picks up the query rotation where the last run stopped. */
export async function runDiscovery(trigger: "manual" | "cron"): Promise<RunStats> {
  if (!isSearchConfigured()) throw new Error("TAVILY_API_KEY is not set.");
  if (!isAiConfigured()) throw new Error("AI_API_KEY, AI_BASE_URL and AI_MODEL must all be set.");

  const started = Date.now();
  const previous = await lastRun();
  const offset = previous ? (previous.query_offset + previous.queries.length) % QUERY_COUNT : 0;
  const year = seasonYear(new Date());
  const queries = queriesForRun(offset, DISCOVERY_LIMITS.queriesPerRun, year);
  const runId = await startRun({ trigger, query_offset: offset, queries });

  const stats: RunStats = {
    queries: 0,
    results: 0,
    alreadyKnown: 0,
    pagesRead: 0,
    saved: 0,
    savedWithPricing: 0,
    skipped: {},
    pages: [],
    errors: [],
    stoppedEarly: false,
  };

  try {
    // Search first, so one page found by two queries is read once.
    const found = new Map<string, { query: string; score: number }>();
    for (const query of queries) {
      try {
        const hits = await searchWeb(query, DISCOVERY_LIMITS.resultsPerQuery, BLOCKED_DOMAINS);
        stats.queries++;
        for (const hit of hits) {
          const url = canonicalUrl(hit.url);
          if (url && !isBlocked(url) && !found.has(url)) {
            found.set(url, { query, score: promise(hit, year) });
          }
        }
      } catch (error) {
        stats.errors.push(`Search "${query}": ${(error as Error).message}`);
      }
    }
    stats.results = found.size;
    // Most promising first (ties keep search order).
    const candidates = new Map(
      [...found.entries()].sort((a, b) => b[1].score - a[1].score).map(([url, v]) => [url, v.query]),
    );

    const known = await knownSourceUrls([...candidates.keys()]);
    stats.alreadyKnown = known.size;

    for (const [url, query] of candidates) {
      if (known.has(url)) continue;
      if (
        stats.pagesRead >= DISCOVERY_LIMITS.maxPagesPerRun ||
        Date.now() - started > DISCOVERY_LIMITS.maxRunMs
      ) {
        stats.stoppedEarly = true;
        break;
      }
      stats.pagesRead++;
      try {
        const outcome = await ingestUrl(url, { discovered_via: "search", discovery_query: query });
        if (outcome.saved) {
          stats.saved++;
          if (outcome.opportunity.has_pricing) stats.savedWithPricing++;
          stats.pages.push({ url, result: `Queued: ${outcome.opportunity.name}` });
        } else {
          const reason = outcome.reason.split(":")[0];
          stats.skipped[reason] = (stats.skipped[reason] ?? 0) + 1;
          stats.pages.push({ url, result: outcome.reason });
        }
      } catch (error) {
        stats.errors.push(`${url}: ${(error as Error).message}`);
        stats.pages.push({ url, result: `Error: ${(error as Error).message}` });
        // Every further page would hit the same limit; stop and leave the rest for the next run.
        if (error instanceof AiRateLimitError) {
          stats.stoppedEarly = true;
          break;
        }
      }
    }

    await finishRun(runId, stats, null);
    return stats;
  } catch (error) {
    await finishRun(runId, stats, (error as Error).message).catch(() => {});
    throw error;
  }
}
