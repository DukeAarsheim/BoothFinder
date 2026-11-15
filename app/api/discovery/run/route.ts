import { auditCalifornia } from "@/lib/discovery/audit";
import { placeUnpinnedEvents } from "@/lib/discovery/backfill";
import { guarded, json } from "@/lib/discovery/http";
import { ingestUrl, runDiscovery } from "@/lib/discovery/pipeline";

// A run searches, reads up to 18 pages, and calls the AI for each.
export const maxDuration = 300;

/**
 * POST {}            → run one discovery batch now.
 * POST { url }       → read one page a person submitted and queue it for review.
 * POST { action: "place" } → give map coordinates to events that have none.
 * POST { action: "audit" } → re-check every opportunity is in California; remove the rest.
 * Header: x-discovery-token.
 */
export function POST(request: Request) {
  return guarded(request, ["admin"], async () => {
    const body = (await request.json().catch(() => ({}))) as { url?: unknown; action?: unknown };
    if (body.action === "place") return json({ placed: await placeUnpinnedEvents(25) });
    if (body.action === "audit") return json({ audit: await auditCalifornia() });
    if (typeof body.url === "string" && body.url.trim()) {
      const outcome = await ingestUrl(body.url.slice(0, 2000), {
        discovered_via: "manual",
        discovery_query: null,
      });
      return json(outcome);
    }
    return json({ stats: await runDiscovery("manual") });
  });
}

/** Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET" (see vercel.json). */
export function GET(request: Request) {
  return guarded(request, ["cron"], async () => {
    const stats = await runDiscovery("cron");
    // Also pin any events added since yesterday that have no coordinates yet.
    const placed = await placeUnpinnedEvents().catch((error) => {
      console.error("Placing unpinned events failed:", error);
      return null;
    });
    return json({ stats, placed });
  });
}
