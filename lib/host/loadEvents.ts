import { connection } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { EventRow } from "@/lib/types";

/** The organizer dashboard reads published listings only, with no sample fallback. */
export async function loadHostEvents(): Promise<{
  events: EventRow[];
  error?: string;
}> {
  await connection();
  const supabase = getSupabaseClient();
  if (!supabase)
    return {
      events: [],
      error:
        "Event listings are unavailable right now. Please try again later.",
    };
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_sample", false)
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) {
    console.error("Organizer event listings failed:", error.message);
    return {
      events: [],
      error: "We couldn't load event listings. Please try again shortly.",
    };
  }
  return { events: data ?? [] };
}
