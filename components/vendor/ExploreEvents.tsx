"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDownUp,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { EVENT_TYPES, type EventRow } from "@/lib/types";
import { inTimingRange } from "@/lib/vendor/cleanEvent";
import { EVENT_TYPE_LABELS } from "@/lib/vendor/format";
import {
  CUT_FILTERS,
  FEE_FILTERS,
  SORT_OPTIONS,
  boothSizeOptions,
  matchesBoothSize,
  matchesBoothFee,
  matchesSalesCut,
  sortEvents,
  type SortBy,
} from "@/lib/vendor/searchOptions";
import { locateEvents } from "@/lib/vendor/geo";
import { useSavedEvents } from "@/lib/vendor/storage";
import EventCard from "./EventCard";
import VendorNotice from "./VendorNotice";

const mapLoading = () => (
  <div className="grid h-full place-items-center bg-neutral-100 text-sm text-neutral-500">
    Loading map…
  </div>
);
// Mapbox when the page passes a token (see lib/vendor/mapboxToken); otherwise the keyless Leaflet map.
const MapboxEventMap = dynamic(() => import("./MapboxEventMap"), {
  ssr: false,
  loading: mapLoading,
});
const EventMap = dynamic(() => import("./EventMap"), {
  ssr: false,
  loading: mapLoading,
});

// The launch counties are always offered; others appear once an event there exists.
const LAUNCH_COUNTIES = ["San Luis Obispo", "Santa Barbara"];
const countyName = (county: string) => county.replace(/\s+county$/i, "").trim();
const inCounty = (e: EventRow, county: string) =>
  (e.county ?? "")
    .toLowerCase()
    .replace(/\s+county$/, "")
    .trim() === county.toLowerCase();

const pill =
  "h-10 rounded-full border border-neutral-300 bg-white text-sm text-neutral-900 transition-colors hover:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700";

/**
 * The Explore page: map (left, ~58%) and results (right), kept in sync.
 * Search and filters narrow BOTH the pins and the cards; clicking either side
 * selects the same event on the other.
 */
export default function ExploreEvents({
  events,
  isSampleData,
  mapboxToken,
}: {
  events: EventRow[];
  isSampleData: boolean;
  mapboxToken?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("");
  const [type, setType] = useState("");
  const [fee, setFee] = useState("");
  const [cut, setCut] = useState("");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState<SortBy>("date-asc");
  // "YYYY-MM-DD" from the date inputs; blank = that end of the range is open.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapboxFailed, setMapboxFailed] = useState(false);
  const { isSaved, toggle } = useSavedEvents();
  const listRef = useRef<HTMLDivElement>(null);

  const sizes = useMemo(() => boothSizeOptions(events), [events]);

  const counties = useMemo(() => {
    const others = new Set<string>();
    for (const e of events) {
      const name = e.county && countyName(e.county);
      if (
        name &&
        !LAUNCH_COUNTIES.some((c) => c.toLowerCase() === name.toLowerCase())
      )
        others.add(name);
    }
    return [...LAUNCH_COUNTIES, ...[...others].sort()];
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) =>
        (!county || inCounty(e, county)) &&
        (!type || e.event_type === type) &&
        inTimingRange(e, from, to) &&
        matchesBoothFee(e, fee) &&
        matchesSalesCut(e, cut) &&
        matchesBoothSize(e, size) &&
        (!q ||
          [e.name, e.city, e.county, e.venue].some((v) =>
            v?.toLowerCase().includes(q),
          )),
    );
  }, [events, query, county, type, from, to, fee, cut, size]);

  // The loader already orders confirmed/expected dates, recurring markets,
  // unknown dates and past events. Preserve that order for Soonest.
  const sorted = useMemo(
    () => (sort === "date-asc" ? filtered : sortEvents(filtered, sort)),
    [filtered, sort],
  );

  const located = useMemo(() => locateEvents(filtered), [filtered]);
  const onMapIds = useMemo(
    () => new Set(located.map((l) => l.event.id)),
    [located],
  );

  // A selection that the filters removed is no longer a selection.
  const activeId =
    selectedId && filtered.some((e) => e.id === selectedId) ? selectedId : null;

  // Bring the selected card into view (e.g. after a pin click).
  useEffect(() => {
    if (!activeId) return;
    listRef.current
      ?.querySelector(`[data-event-id="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  const filterCount = [county, type, fee, cut, size, from, to].filter(
    Boolean,
  ).length;
  const clearFilters = () => {
    setCounty("");
    setType("");
    setFee("");
    setCut("");
    setSize("");
    setFrom("");
    setTo("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <section
        aria-label="Event map"
        className="relative h-[42dvh] shrink-0 lg:h-auto lg:flex-[58]"
      >
        {mapboxToken && !mapboxFailed ? (
          <MapboxEventMap
            token={mapboxToken}
            events={located}
            selectedId={activeId}
            onSelect={setSelectedId}
            onError={() => setMapboxFailed(true)}
          />
        ) : (
          <EventMap
            events={located}
            selectedId={activeId}
            onSelect={setSelectedId}
          />
        )}
      </section>

      <section
        aria-label="Event results"
        className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 lg:flex-[42] lg:border-t-0 lg:border-l"
      >
        <div className="border-b border-neutral-200 px-5 pt-5 pb-3">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">
            Events in California
          </h1>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-500"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by event, city, or venue"
              aria-label="Search events"
              className={`${pill} h-11 w-full pr-4 pl-10 placeholder:text-neutral-500`}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              popoverTarget="vendor-filter-popover"
              className={`${pill} inline-flex items-center gap-2 px-4 [anchor-name:--vendor-filter-trigger]`}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Filters
              {filterCount > 0 && (
                <span className="rounded-full bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-800">
                  {filterCount}
                </span>
              )}
              <ChevronDown className="size-3.5" aria-hidden />
            </button>
            <label
              className={`${pill} relative inline-flex cursor-pointer items-center gap-2 px-4 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-emerald-700`}
            >
              <ArrowDownUp className="size-4" aria-hidden />
              Sort by
              <ChevronDown className="size-3.5" aria-hidden />
              <select
                aria-label="Sort by"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortBy)}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              >
                {SORT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            id="vendor-filter-popover"
            popover="auto"
            role="dialog"
            aria-label="Event filters"
            className="fixed inset-auto z-[1300] m-0 mt-2 max-h-[min(36rem,70dvh)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl [position-anchor:--vendor-filter-trigger] [position-area:bottom_span-right] [position-try-fallbacks:flip-inline,flip-block] [color-scheme:light]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Filter events</h2>
              <button
                type="button"
                popoverTarget="vendor-filter-popover"
                popoverTargetAction="hide"
                aria-label="Close filters"
                className="grid size-9 place-items-center rounded-full hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                County
                <select
                  aria-label="Filter by county"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className={`${pill} mt-1.5 w-full px-3`}
                >
                  <option value="">All counties</option>
                  {counties.map((c) => (
                    <option key={c} value={c}>
                      {c} County
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Event type
                <select
                  aria-label="Filter by event type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={`${pill} mt-1.5 w-full px-3`}
                >
                  <option value="">All types</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {EVENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Booth fee
                <select
                  aria-label="Filter by booth fee"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className={`${pill} mt-1.5 w-full px-3`}
                >
                  {FEE_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Sales cut
                <select
                  aria-label="Filter by sales cut"
                  value={cut}
                  onChange={(e) => setCut(e.target.value)}
                  className={`${pill} mt-1.5 w-full px-3`}
                >
                  {CUT_FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Booth size
                <select
                  aria-label="Filter by booth size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className={`${pill} mt-1.5 w-full px-3`}
                >
                  <option value="">Any booth size</option>
                  {sizes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  <option value="unknown">Booth size not listed</option>
                </select>
              </label>
              <label className="min-w-0 text-sm font-medium">
                From
                <input
                  aria-label="From"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className={`${pill} mt-1.5 w-full min-w-0 px-3`}
                />
              </label>
              <label className="min-w-0 text-sm font-medium">
                To
                <input
                  aria-label="To"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className={`${pill} mt-1.5 w-full min-w-0 px-3`}
                />
              </label>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-neutral-500">
              Booth fees use the lowest listed tier. Missing values stay
              unlisted. Booth sizes match the dimensions stated in a listing;
              confirm availability with the organizer.
            </p>
            <div className="sticky -bottom-5 -mx-5 mt-4 flex items-center justify-between gap-3 border-t border-neutral-200 bg-white px-5 py-4">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                Reset filters
              </button>
              <button
                type="button"
                popoverTarget="vendor-filter-popover"
                popoverTargetAction="hide"
                className="rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Show {filtered.length}{" "}
                {filtered.length === 1 ? "event" : "events"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-neutral-500" aria-live="polite">
            {filtered.length === events.length
              ? `${events.length} ${events.length === 1 ? "event" : "events"}`
              : `${filtered.length} of ${events.length} events`}
            {filtered.length > located.length &&
              ` · ${filtered.length - located.length} without a map location`}
          </p>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          {isSampleData && (
            <p className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-[13px] text-amber-900">
              <span className="font-semibold">Sample data.</span> The database
              isn&apos;t connected on this machine, so these events are made up.
              Add the Supabase values to{" "}
              <code className="font-mono text-xs">.env.local</code> to see real
              ones.
            </p>
          )}
          {events.length === 0 ? (
            <div className="p-5">
              <VendorNotice title="No events yet">
                <p>
                  The events table is empty. Events appear here as soon as they
                  are added.
                </p>
              </VendorNotice>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <VendorNotice title="No events match">
                <p>Try a different search, or clear the filters.</p>
              </VendorNotice>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200 border-b border-neutral-200">
              {sorted.map((event) => (
                <li key={event.id}>
                  <EventCard
                    event={event}
                    selected={event.id === activeId}
                    saved={isSaved(event.id)}
                    onMap={onMapIds.has(event.id)}
                    onSelect={setSelectedId}
                    onToggleSave={toggle}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
