import {
  approveOpportunity,
  rejectOpportunity,
  removeApprovedOpportunity,
} from "@/lib/discovery/approve";
import { guarded, json } from "@/lib/discovery/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST { action: "approve" | "reject" | "remove", note? }.
 * Approving creates the `events` row; "remove" deletes it again.
 */
export function POST(request: Request, ctx: RouteContext<"/api/discovery/opportunities/[id]">) {
  return guarded(request, ["admin"], async () => {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return json({ error: "Opportunity not found." }, 404);

    const body = (await request.json().catch(() => ({}))) as { action?: unknown; note?: unknown };
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

    const actions = {
      approve: approveOpportunity,
      reject: rejectOpportunity,
      remove: removeApprovedOpportunity,
    };
    const act = typeof body.action === "string" && Object.hasOwn(actions, body.action)
      ? actions[body.action as keyof typeof actions]
      : null;
    if (!act) return json({ error: 'action must be "approve", "reject" or "remove".' }, 400);
    const result = await act(id, note);
    return result.ok ? json(result) : json({ error: result.error }, result.status);
  });
}
