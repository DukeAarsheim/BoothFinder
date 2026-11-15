import { lookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { BlockList, isIP } from "node:net";

/** Errors are deliberately safe to show to someone who submitted a URL. */
export class PublicFetchError extends Error {}

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
] as const) blocked.addSubnet(address, prefix, "ipv6");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");

/** Reject local, reserved, translated and other non-public addresses. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) return globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
  return false;
}

export function assertPublicUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new PublicFetchError("That doesn't look like a web address.");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (
    !["http:", "https:"].includes(url.protocol) || url.username || url.password ||
    !host || (!isIP(host) && (!host.includes(".") || /(?:^|\.)(?:localhost|local|internal)$/.test(host))) ||
    (isIP(host) !== 0 && !isPublicAddress(host))
  ) throw new PublicFetchError("We can only read public web pages.");
  return url;
}

type Address = { address: string; family: 4 | 6 };
type Resolver = (host: string, options: { all: true }) => Promise<{ address: string; family: number }[]>;
type Options = {
  headers?: Record<string, string>;
  maxBytes: number;
  timeoutMs: number;
  beforeRequest?: (url: URL) => Promise<void>;
};

/** Resolve once, reject mixed public/private answers, and pin the connection to that answer. */
export async function resolvePublic(url: URL, signal: AbortSignal, resolver: Resolver = lookup): Promise<Address> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const ip = isIP(host);
  if (ip) {
    if (!isPublicAddress(host)) throw new PublicFetchError("We can only read public web pages.");
    return { address: host, family: ip as 4 | 6 };
  }
  let results: { address: string; family: number }[];
  try {
    results = await Promise.race([
      resolver(host, { all: true }),
      new Promise<never>((_, reject) => {
        if (signal.aborted) reject(new Error("Timed out"));
        else signal.addEventListener("abort", () => reject(new Error("Timed out")), { once: true });
      }),
    ]);
  } catch {
    throw new PublicFetchError("We couldn't reach that page. Check the link and try again.");
  }
  if (!results.length || results.some((item) => !isPublicAddress(item.address))) {
    throw new PublicFetchError("We can only read public web pages.");
  }
  return { address: results[0].address, family: results[0].family as 4 | 6 };
}

function requestOnce(url: URL, address: Address, signal: AbortSignal, options: Options): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).request(url, {
      headers: { ...options.headers, "Accept-Encoding": "identity" },
      signal,
      family: address.family,
      agent: false,
      // DNS was checked immediately above; never resolve it a second time on connect.
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
    }, (response) => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
        else if (value !== undefined) headers.set(key, value);
      }
      const status = response.statusCode ?? 502;
      if (status >= 300 && status < 400 && headers.has("location")) {
        response.destroy();
        resolve(new Response(null, { status, headers }));
        return;
      }
      const encoding = headers.get("content-encoding");
      if (encoding && encoding.toLowerCase() !== "identity") {
        response.destroy();
        reject(new PublicFetchError("That page uses an unsupported content encoding."));
        return;
      }
      const declared = Number(headers.get("content-length"));
      if (Number.isFinite(declared) && declared > options.maxBytes) {
        response.destroy();
        reject(new PublicFetchError("That document is too large."));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > options.maxBytes) {
          response.destroy();
          reject(new PublicFetchError("That document is too large."));
        } else chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        const noBody = status === 204 || status === 205 || status === 304;
        resolve(new Response(noBody ? null : new Uint8Array(Buffer.concat(chunks)), { status, headers }));
      });
    });
    request.on("error", reject);
    request.end();
  });
}

/** Fetch a bounded public document; revalidate and pin DNS on every redirect. */
export async function fetchPublicUrl(input: string, options: Options): Promise<{ response: Response; url: string }> {
  const signal = AbortSignal.timeout(options.timeoutMs);
  let url = assertPublicUrl(input);
  for (let hop = 0; hop <= 5; hop++) {
    await options.beforeRequest?.(url);
    const address = await resolvePublic(url, signal);
    let response: Response;
    try {
      response = await requestOnce(url, address, signal, options);
    } catch (error) {
      if (error instanceof PublicFetchError) throw error;
      throw new PublicFetchError("We couldn't reach that page. Check the link and try again.");
    }
    const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
    if (!location) return { response, url: url.toString() };
    try {
      url = assertPublicUrl(new URL(location, url).toString());
    } catch (error) {
      if (error instanceof PublicFetchError) throw error;
      throw new PublicFetchError("That page redirected to an invalid address.");
    }
  }
  throw new PublicFetchError("That page redirected too many times.");
}
