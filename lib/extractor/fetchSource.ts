import "server-only";

import { createHash } from "node:crypto";
import { htmlToText } from "./htmlText";
import { isAllowedByRobots } from "./robots";
import { fetchPublicUrl, PublicFetchError } from "./publicFetch";

/**
 * Fetches one public page or PDF and returns its text. Polite and defensive:
 * it identifies itself, obeys robots.txt, refuses private network addresses,
 * and caps size and time.
 */

export const CRAWLER_USER_AGENT =
  "BoothfinderBot/0.1 (student project; reads public vendor-application pages)";

const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

export type FetchedDocument = {
  /** Final URL after redirects. */
  url: string;
  kind: "html" | "pdf";
  title: string | null;
  text: string;
  /** Absolute http(s) links found in an HTML page, with their link text. */
  links: { href: string; text: string }[];
  contentHash: string;
};

/** A fetch that was refused or failed for a reason worth recording, not a bug. */
export class SourceFetchError extends Error {}

const robotsCache = new Map<string, Promise<string | null>>();

function robotsFor(origin: string): Promise<string | null> {
  let cached = robotsCache.get(origin);
  if (!cached) {
    cached = fetchPublicUrl(`${origin}/robots.txt`, {
      headers: { "User-Agent": CRAWLER_USER_AGENT },
      maxBytes: 512 * 1024,
      timeoutMs: 8_000,
    })
      .then(({ response }) => (response.ok ? response.text() : null))
      .catch(() => null);
    robotsCache.set(origin, cached);
  }
  return cached;
}

export async function fetchDocument(input: string): Promise<FetchedDocument> {
  let res: Response;
  let finalUrl: string;
  try {
    ({ response: res, url: finalUrl } = await fetchPublicUrl(input, {
        headers: {
          "User-Agent": CRAWLER_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9",
        },
        maxBytes: MAX_BYTES,
        timeoutMs: TIMEOUT_MS,
        beforeRequest: async (url) => {
          const robots = await robotsFor(url.origin);
          if (robots && !isAllowedByRobots(robots, url.pathname + url.search, CRAWLER_USER_AGENT)) {
            throw new SourceFetchError("The site's robots.txt asks crawlers not to read this page.");
          }
        },
    }));
  } catch (error) {
    if (error instanceof SourceFetchError) throw error;
    throw new SourceFetchError(error instanceof PublicFetchError ? error.message : "The site didn't respond.");
  }
  if (!res.ok) throw new SourceFetchError(`The site returned ${res.status}.`);

  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  const bytes = new Uint8Array(await res.arrayBuffer());
  const isPdf =
    type.includes("application/pdf") ||
    (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46); // "%PDF"

  let title: string | null = null;
  let text: string;
  const links: FetchedDocument["links"] = [];

  if (isPdf) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    try {
      const pdf = await getDocumentProxy(bytes);
      text = (await extractText(pdf, { mergePages: true })).text;
    } catch {
      throw new SourceFetchError("The PDF couldn't be read.");
    }
    if (text.trim().length < 40) {
      throw new SourceFetchError("The PDF has no selectable text (it may be a scan).");
    }
  } else if (type.includes("html") || type.includes("text/plain") || type === "") {
    const page = htmlToText(new TextDecoder("utf-8").decode(bytes));
    title = page.title;
    text = page.text;
    const seen = new Set<string>();
    for (const link of page.links) {
      try {
        const abs = new URL(link.href, finalUrl);
        if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
        abs.hash = "";
        const href = abs.toString();
        if (seen.has(href)) continue;
        seen.add(href);
        links.push({ href, text: link.text });
      } catch {
        // Not a usable link.
      }
    }
  } else {
    throw new SourceFetchError(`Unsupported content type (${type.split(";")[0]}).`);
  }

  return {
    url: finalUrl,
    kind: isPdf ? "pdf" : "html",
    title,
    text,
    links,
    contentHash: createHash("sha256").update(text).digest("hex"),
  };
}
