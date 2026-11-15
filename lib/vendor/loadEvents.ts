import { connection } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { EventRow } from "@/lib/types";
import { cleanEvent, sortByDate } from "./cleanEvent";
import { SAMPLE_EVENTS } from "./sampleEvents";

export type EventsResult = {
  events: EventRow[];
  /** "sample" = Supabase isn't configured, so labeled made-up events are shown instead. */
  source: "database" | "sample";
  error?: string;
};

/**
 * Loads every event for the vendor dashboard, cleaned (./cleanEvent.ts) and
 * sorted soonest first. Call it from an async Server Component inside
 * <Suspense> (see README "Loading data in pages").
 */
export async function loadEvents(): Promise<EventsResult> {
  if (!isSupabaseConfigured) return { events: SAMPLE_EVENTS, source: "sample" };

  await connection();
  const supabase = getSupabaseClient();
  if (!supabase) return { events: SAMPLE_EVENTS, source: "sample" };

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) return { events: [], source: "database", error: error.message };
  const today = new Date().toISOString().slice(0, 10);
  return { events: sortByDate(data.map((row) => cleanEvent(row, today)), today), source: "database" };
}
