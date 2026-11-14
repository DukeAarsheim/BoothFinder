import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import Notice from "@/components/ui/Notice";
import PageContainer from "@/components/ui/PageContainer";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const metadata: Metadata = { title: "Events" };

// Foundation version of the event list: it proves the app can read the database.
// Cards, filters, Fit scores, and the detail page are separate Kanban cards.
//
// DATA-LOADING PATTERN for this Next.js version (Cache Components is on):
// the page itself stays synchronous, and anything that reads live data goes in an
// async component wrapped in <Suspense>. The fallback is prerendered; the data
// streams in fresh on every request. See README "Loading data in pages".
export default function EventsPage() {
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold tracking-tight">Events</h1>
      <p className="mt-2 text-neutral-300">
        Events that take vendors, read live from the database.
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        Filters, Fit scores, and event detail pages are not built yet.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-neutral-400">Loading events…</p>}>
          <EventList />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function EventList() {
  if (!isSupabaseConfigured) {
    return (
      <Notice title="The database isn't connected yet" tone="warning">
        <p>
          Copy <code className="font-mono">.env.example</code> to{" "}
          <code className="font-mono">.env.local</code>, fill in the two public
          Supabase values, and restart the dev server. The README has the steps.
        </p>
      </Notice>
    );
  }

  // Wait for a real request, so the list is never frozen at build time.
  await connection();

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, city, county, is_sample")
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    return (
      <Notice title="Couldn't load events" tone="error">
        <p>The database returned an error: {error.message}</p>
      </Notice>
    );
  }

  if (events.length === 0) {
    return (
      <Notice title="No events yet">
        <p>
          The database is connected and the events table is empty. Events show
          up here as soon as they are added.
        </p>
      </Notice>
    );
  }

  return (
    <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
      {events.map((event) => {
        const location = [event.city, event.county && `${event.county} County`]
          .filter(Boolean)
          .join(", ");
        return (
          <li
            key={event.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3"
          >
            <span className="font-medium">{event.name}</span>
            {/* MASTER.md §6: made-up rows must be visibly labeled. */}
            {event.is_sample && (
              <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-xs font-semibold text-amber-300">
                Sample
              </span>
            )}
            {location && (
              <span className="text-sm text-neutral-400">{location}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
