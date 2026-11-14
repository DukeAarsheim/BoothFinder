"use client";

import Link from "next/link";
import Notice from "@/components/ui/Notice";
import type { EventRow } from "@/lib/types";
import { useSavedEvents } from "@/lib/vendor/storage";
import EventCard from "./EventCard";

/** Saved events are kept in this browser (no accounts), then matched to live rows. */
export default function SavedEvents({ events }: { events: EventRow[] }) {
  const { savedIds, toggle } = useSavedEvents();
  const saved = events.filter((e) => savedIds.includes(e.id));

  if (saved.length === 0) {
    return (
      <Notice title="No saved events yet">
        <p>
          Tap the bookmark on any event in{" "}
          <Link href="/vendor" className="font-medium text-emerald-400 hover:text-emerald-300">
            Explore Events
          </Link>{" "}
          to keep it here. Saved events stay in this browser.
        </p>
      </Notice>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {saved.map((event) => (
        <EventCard key={event.id} event={event} saved onToggleSave={toggle} />
      ))}
    </div>
  );
}
