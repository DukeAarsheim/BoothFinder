import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Action = "publish" | "extract" | "assistant";
const LIMITS: Record<Action, { count: number; seconds: number }> = {
  publish: { count: 10, seconds: 60 },
  extract: { count: 8, seconds: 60 },
  assistant: { count: 20, seconds: 60 },
};

/** Never authorize from browser storage or user-editable Supabase metadata. */
export async function requireOrganizer(request: Request, action: Action): Promise<Response | null> {
  const token = /^Bearer ([A-Za-z0-9._-]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return Response.json({ error: "Sign in as an approved organizer to continue." }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ error: "Organizer access isn't configured on the server." }, { status: 503 });
  let userId: string | undefined;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (!error) userId = data.user?.id;
  } catch {
    return Response.json({ error: "We couldn't verify your sign-in. Try again." }, { status: 503 });
  }
  if (!userId) return Response.json({ error: "Your sign-in has expired. Please sign in again." }, { status: 401 });

  const approved = (process.env.BOOTHFINDER_ORGANIZER_IDS ?? "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  if (!approved.length) {
    return Response.json({ error: "Organizer access hasn't been configured yet. Ask the project owner to set it up." }, { status: 503 });
  }
  if (!approved.includes(userId)) {
    return Response.json({ error: "This account isn't approved for organizer tools yet." }, { status: 403 });
  }

  const limit = LIMITS[action];
  // This new RPC is intentionally server-only; regenerated database types can
  // be checked in after the project owner applies the migration.
  const db = admin as SupabaseClient;
  let data: unknown;
  let error: unknown;
  try {
    ({ data, error } = await db.rpc("consume_organizer_api_limit", {
      p_user_id: userId, p_action: action, p_limit: limit.count, p_window_seconds: limit.seconds,
    }));
  } catch (cause) {
    error = cause;
  }
  if (error || typeof data !== "number" || !Number.isFinite(data) || data < 0) {
    console.error("Organizer API rate limit is unavailable");
    return Response.json({ error: "Organizer tools aren't ready yet. Please try again shortly." }, { status: 503 });
  }
  if (data > 0) {
    const retry = Math.ceil(data);
    return Response.json({ error: "Too many requests. Please wait a moment and try again." }, {
      status: 429, headers: { "Retry-After": String(retry) },
    });
  }
  return null;
}
