"use client";

import { useState } from "react";
import Link from "next/link";
import type { EventRow } from "@/lib/types";
import { useSavedEvents } from "@/lib/vendor/storage";
import SearchBar from "@/components/ui/SearchBar";
import { searchEvents } from "@/lib/vendor/eventSearch";
import EventCard from "./EventCard";
import VendorNotice from "./VendorNotice";

/** Saved events are kept in this browser (no accounts), then matched to live rows. */
export default function SavedEvents({ events }: { events: EventRow[] }) {
  const { savedIds, toggle } = useSavedEvents();
  const saved = events.filter((e) => savedIds.includes(e.id));
  const [query, setQuery] = useState("");
  const shown = searchEvents(saved, query);

  if (saved.length === 0) {
    return (
      <VendorNotice title="No saved events yet">
        <p>
          Tap the bookmark on any event in{" "}
          <Link href="/vendor" className="font-medium text-emerald-700 underline-offset-2 hover:underline">
            Explore Events
          </Link>{" "}
          to keep it here. Saved events stay in this browser.
        </p>
      </VendorNotice>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={query}
        onChange={setQuery}
        label="Search saved events"
        placeholder="Search your saved events by name, place, date, fee…"
        shown={shown.length}
        total={saved.length}
      />
      {shown.length === 0 ? (
        <VendorNotice title="No saved events match that search">
          <p>Try fewer words, or clear the search to see all {saved.length}.</p>
        </VendorNotice>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
          {shown.map((event) => (
            <li key={event.id}>
              <EventCard event={event} saved onToggleSave={toggle} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
