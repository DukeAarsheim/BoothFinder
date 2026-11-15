import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * Vercel overwrites this header with the connecting client's IP. Outside Vercel
 * there is no trusted proxy in this app, so all callers share a local bucket.
 * Store a keyed digest, not the raw IP address.
 */
export function rateLimitBucket(request: Request, secret: string, onVercel: boolean): string | null {
  let identity = "local";
  if (onVercel) {
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const family = isIP(ip);
    if (!family) return null;
    identity = family === 6 ? new URL(`http://[${ip}]`).hostname.slice(1, -1) : ip;
  }
  return createHmac("sha256", secret).update(`boothfinder-api-limit-v1:${identity}`).digest("hex");
}
