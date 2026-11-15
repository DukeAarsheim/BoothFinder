import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Discovery routes spend AI credits and write to the database, and the app has
 * no accounts, so they are locked behind a shared secret:
 *   DISCOVERY_ADMIN_TOKEN  typed into the review page by a teammate
 *   CRON_SECRET            sent by Vercel Cron as "Authorization: Bearer ..."
 * With neither set, every discovery route refuses.
 */

const digest = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export function isAdminConfigured() {
  return Boolean(process.env.DISCOVERY_ADMIN_TOKEN);
}

export function authorize(request: Request): "admin" | "cron" | null {
  const adminToken = process.env.DISCOVERY_ADMIN_TOKEN;
  const cronSecret = process.env.CRON_SECRET;
  // The review page percent-encodes the token so any character survives the header.
  const rawHeader = request.headers.get("x-discovery-token");
  let header = rawHeader;
  try {
    if (rawHeader) header = decodeURIComponent(rawHeader);
  } catch {
    // Not valid encoding: compare it as sent.
  }
  const bearer = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];

  if (adminToken && header && same(header, adminToken)) return "admin";
  if (cronSecret && bearer && same(bearer, cronSecret)) return "cron";
  return null;
}
