"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FilePlus } from "lucide-react";
import VendorNotice, { SampleTag } from "@/components/vendor/VendorNotice";
import { sortByDeadline } from "@/lib/host/metrics";
import type { HostAccount } from "@/lib/host/types";
import { EVENT_TYPE_LABELS, formatBoothFee, formatDateRange } from "@/lib/vendor/format";
import EventActions from "./EventActions";
import EventPanels from "./EventPanels";
import EventsList from "./EventsList";
import Inbox from "./Inbox";

/**
 * The organizer's home: their events with the application pipeline, then the
 * selected event's panels beside the inbox. Owns one piece of state, which
 * event is selected. Every number comes from lib/host/metrics.ts and every
 * sentence from lib/host/labels.ts.
 */
export default function HostDashboard({
  account,
  today,
}: {
  account: HostAccount;
  /** Today's date as YYYY-MM-DD, read on the server (see the page). */
  today: string;
}) {
  const events = useMemo(() => sortByDeadline(account.events, today), [account.events, today]);
  const eventNames = useMemo(
    () => Object.fromEntries(account.events.map((e) => [e.event.id, e.event.name])),
    [account.events],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Until the organizer picks one, show the event with the soonest deadline.
  const selected = events.find((e) => e.event.id === selectedId) ?? events[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Dashboard</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-neutral-600">
            {account.organizer}
            {account.isSample && <SampleTag />}
          </p>
        </div>
        <Link
          href="/host/dashboard/create"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <FilePlus className="size-4" aria-hidden />
          Create event from PDF
        </Link>
      </header>

      {account.isSample && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-[13px] text-amber-900">
          <span className="font-semibold">Sample account.</span> Organizer accounts aren&apos;t
          connected yet, so this organizer and its events, vendors, messages, and numbers are made up.
        </p>
      )}

      {!selected ? (
        <div className="mt-8">
          <VendorNotice title="No events yet">
            <p>Create your first event from a vendor packet PDF. Applications and messages show up here.</p>
          </VendorNotice>
        </div>
      ) : (
        <>
          <section aria-labelledby="events-heading" className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="events-heading" className="text-lg font-semibold tracking-tight text-neutral-950">
                Your events
              </h2>
              <p className="text-[13px] text-neutral-500">
                {events.length} {events.length === 1 ? "event" : "events"} · soonest deadline first
              </p>
            </div>
            <div className="mt-3">
              <EventsList
                events={events}
                selectedId={selected.event.id}
                today={today}
                onSelect={setSelectedId}
              />
            </div>
          </section>

          <div className="mt-10 grid gap-x-8 gap-y-10 xl:grid-cols-3">
            <section aria-labelledby="selected-event-heading" className="xl:col-span-2">
              <h2
                id="selected-event-heading"
                className="text-lg font-semibold tracking-tight text-neutral-950"
              >
                {selected.event.name}
              </h2>
              <p className="mt-0.5 text-sm text-neutral-600">
                {[
                  EVENT_TYPE_LABELS[selected.event.event_type] ?? selected.event.event_type,
                  formatDateRange(selected.event.start_date, selected.event.end_date),
                  formatBoothFee(selected.event) && `${formatBoothFee(selected.event)} booth fee`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-3">
                <EventActions key={selected.event.id} hostEvent={selected} />
              </div>
              <div className="mt-5">
                <EventPanels hostEvent={selected} />
              </div>
            </section>

            <Inbox messages={account.messages} eventNames={eventNames} isSample={account.isSample} />
          </div>
        </>
      )}
    </div>
  );
}
