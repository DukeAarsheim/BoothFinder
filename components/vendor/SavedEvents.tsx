"use client";

import Link from "next/link";
import type { EventRow } from "@/lib/types";
import { useSavedEvents } from "@/lib/vendor/storage";
import EventCard from "./EventCard";
import VendorNotice from "./VendorNotice";

/** Saved events are kept in this browser (no accounts), then matched to live rows. */
export default function SavedEvents({ events }: { events: EventRow[] }) {
  const { savedIds, toggle } = useSavedEvents();
  const saved = events.filter((e) => savedIds.includes(e.id));

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
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
      {saved.map((event) => (
        <li key={event.id}>
          <EventCard event={event} saved onToggleSave={toggle} />
        </li>
      ))}
    </ul>
  );
}
