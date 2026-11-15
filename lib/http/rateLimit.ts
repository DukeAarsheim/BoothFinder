import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimitBucket } from "./rateLimitIdentity";

type Action = "publish" | "extract" | "assistant";
const LIMITS: Record<Action, { perClient: number; global: number; seconds: number }> = {
  publish: { perClient: 10, global: 60, seconds: 60 },
  extract: { perClient: 8, global: 30, seconds: 60 },
  assistant: { perClient: 20, global: 80, seconds: 60 },
};

/** Limits anonymous requests across Vercel instances, without changing sign-in. */
export async function rateLimit(request: Request, action: Action): Promise<Response | null> {
  const admin = getSupabaseAdmin();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!admin || !secret) return Response.json({ error: "This tool isn't configured on the server yet." }, { status: 503 });
  const bucket = rateLimitBucket(request, secret, process.env.VERCEL === "1");
  if (!bucket) return Response.json({ error: "We couldn't verify this request. Please try again." }, { status: 503 });

  const limit = LIMITS[action];
  // The new RPC is server-only; Duke can regenerate types after the migration.
  const db = admin as SupabaseClient;
  let data: unknown;
  let error: unknown;
  try {
    ({ data, error } = await db.rpc("consume_public_api_limit", {
      p_bucket: bucket, p_action: action, p_client_limit: limit.perClient,
      p_global_limit: limit.global, p_window_seconds: limit.seconds,
    }));
  } catch (cause) {
    error = cause;
  }
  if (error || typeof data !== "number" || !Number.isFinite(data) || data < 0) {
    console.error("API rate limit is unavailable");
    return Response.json({ error: "This tool isn't ready yet. Please try again shortly." }, { status: 503 });
  }
  if (data > 0) {
    return Response.json({ error: "Too many requests. Please wait a moment and try again." }, {
      status: 429, headers: { "Retry-After": String(Math.ceil(data)) },
    });
  }
  return null;
}
