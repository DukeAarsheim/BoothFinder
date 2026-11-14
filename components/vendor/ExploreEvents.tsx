"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Search, X } from "lucide-react";
import Notice from "@/components/ui/Notice";
import { EVENT_TYPES, type EventRow } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/vendor/format";
import { locateEvents } from "@/lib/vendor/geo";
import { useSavedEvents } from "@/lib/vendor/storage";
import EventCard from "./EventCard";

const EventMap = dynamic(() => import("./EventMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-neutral-500">Loading map…</div>
  ),
});

const COUNTIES = ["San Luis Obispo", "Santa Barbara"] as const;
const inCounty = (e: EventRow, county: string) =>
  (e.county ?? "").toLowerCase().replace(/\s+county$/, "").trim() === county.toLowerCase();

const field =
  "h-10 rounded-lg border border-neutral-800 bg-neutral-900 text-sm text-neutral-100 transition-colors hover:border-neutral-600 focus-visible:outline-2 focus-visible:outline-emerald-400";

/**
 * The Explore page: map (left, ~58%) and results (right), kept in sync.
 * Search and filters narrow BOTH the pins and the cards; clicking either side
 * selects the same event on the other.
 */
export default function ExploreEvents({
  events,
  isSampleData,
}: {
  events: EventRow[];
  isSampleData: boolean;
}) {
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("");
  const [type, setType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isSaved, toggle } = useSavedEvents();
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) =>
        (!county || inCounty(e, county)) &&
        (!type || e.event_type === type) &&
        (!q ||
          [e.name, e.city, e.county, e.venue].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [events, query, county, type]);

  const located = useMemo(() => locateEvents(filtered), [filtered]);
  const onMapIds = useMemo(() => new Set(located.map((l) => l.event.id)), [located]);

  // A selection that the filters removed is no longer a selection.
  const activeId = selectedId && filtered.some((e) => e.id === selectedId) ? selectedId : null;

  // Bring the selected card into view (e.g. after a pin click).
  useEffect(() => {
    if (!activeId) return;
    listRef.current
      ?.querySelector(`[data-event-id="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  const hasFilters = Boolean(query || county || type);
  const clear = () => {
    setQuery("");
    setCounty("");
    setType("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <section aria-label="Event map" className="relative h-[42dvh] shrink-0 lg:h-auto lg:flex-[58]">
        <EventMap events={located} selectedId={activeId} onSelect={setSelectedId} />
      </section>

      <section
        aria-label="Event results"
        className="flex min-h-0 flex-1 flex-col border-t border-neutral-800 lg:flex-[42] lg:border-t-0 lg:border-l"
      >
        <div className="space-y-3 border-b border-neutral-800 p-4">
          <h1 className="text-xl font-bold tracking-tight">Explore Events</h1>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by event, city, or venue"
              aria-label="Search events"
              className={`${field} w-full pr-3 pl-9 placeholder:text-neutral-500`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              aria-label="Filter by county"
              className={`${field} px-2.5`}
            >
              <option value="">All counties</option>
              {COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c} County
                </option>
              ))}
            </select>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Filter by event type"
              className={`${field} px-2.5`}
            >
              <option value="">All types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm text-neutral-400 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <X className="size-4" aria-hidden />
                Clear
              </button>
            )}
          </div>
          <p className="text-sm text-neutral-400" aria-live="polite">
            {filtered.length} of {events.length} {events.length === 1 ? "event" : "events"}
            {filtered.length > located.length &&
              ` · ${filtered.length - located.length} without a map location`}
          </p>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {isSampleData && (
            <Notice title="Showing sample events" label="Sample" tone="warning">
              <p>
                The database isn&apos;t connected on this machine, so these are made-up
                events for building the UI. Add the Supabase values to{" "}
                <code className="font-mono">.env.local</code> to see real ones.
              </p>
            </Notice>
          )}
          {events.length === 0 ? (
            <Notice title="No events yet">
              <p>The events table is empty. Events appear here as soon as they are added.</p>
            </Notice>
          ) : filtered.length === 0 ? (
            <Notice title="No events match">
              <p>Try a different search, or clear the filters.</p>
            </Notice>
          ) : (
            filtered.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                selected={event.id === activeId}
                saved={isSaved(event.id)}
                onMap={onMapIds.has(event.id)}
                onSelect={setSelectedId}
                onToggleSave={toggle}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
