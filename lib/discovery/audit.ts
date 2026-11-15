import "server-only";

import { SourceFetchError, fetchDocument } from "@/lib/extractor/fetchSource";
import { removeApprovedOpportunity } from "./approve";
import { proveCalifornia, readableUrl } from "./pipeline";
import { listOpportunities, reviewOpportunity } from "./store";

export type AuditResult = {
  checked: number;
  /** Proven to be in California; left alone. */
  kept: number;
  /** Taken out: pending ones rejected, approved ones removed from the map. */
  removed: { name: string; was: "pending" | "approved"; reason: string }[];
  /** The source couldn't be read right now, so nothing was decided. */
  unchecked: { name: string; reason: string }[];
};

const MAX_MS = 220_000;

/**
 * Re-checks every pending and approved opportunity against the California rule
 * (./pipeline.ts proveCalifornia) by re-reading its sources. Anything that can't
 * be shown to be in California is taken out: this is how entries queued or
 * approved under an older, looser rule get cleaned up. No AI calls.
 */
export async function auditCalifornia(): Promise<AuditResult> {
  const started = Date.now();
  const result: AuditResult = { checked: 0, kept: 0, removed: [], unchecked: [] };
  const opportunities = [...(await listOpportunities("approved")), ...(await listOpportunities("pending"))];

  for (const opportunity of opportunities) {
    if (Date.now() - started > MAX_MS) {
      result.unchecked.push({ name: opportunity.name, reason: "Ran out of time; run the check again." });
      continue;
    }
    result.checked++;

    const urls = [opportunity.source_url, ...opportunity.source_documents.map((d) => d.url)];
    const texts: string[] = [];
    for (const url of [...new Set(urls)].slice(0, 4)) {
      try {
        const doc = await fetchDocument(readableUrl(url));
        texts.push(doc.title ? `${doc.title}\n${doc.text}` : doc.text);
      } catch (error) {
        if (!(error instanceof SourceFetchError)) throw error;
      }
    }
    if (texts.length === 0) {
      result.unchecked.push({ name: opportunity.name, reason: "Its source page couldn't be read." });
      continue;
    }

    const proof = await proveCalifornia({
      venue: opportunity.extracted.venue ?? null,
      city: opportunity.extracted.city ?? null,
      county: opportunity.extracted.county ?? null,
      texts,
      host: new URL(opportunity.source_url).hostname,
    });
    if (proof.ok) {
      result.kept++;
      continue;
    }

    const note = `Not shown to be in California: ${proof.reason}`;
    const was = opportunity.status === "approved" ? "approved" : "pending";
    if (was === "approved") await removeApprovedOpportunity(opportunity.id, note);
    else await reviewOpportunity(opportunity.id, { status: "rejected", review_note: note });
    result.removed.push({ name: opportunity.name, was, reason: proof.reason });
  }
  return result;
}
