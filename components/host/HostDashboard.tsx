"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ExternalLink, FilePlus, MapPin } from "lucide-react";
import VendorNotice from "@/components/vendor/VendorNotice";
import type { EventRow } from "@/lib/types";
import {
  EVENT_TYPE_LABELS,
  formatBoothFee,
  formatDate,
  formatLocation,
} from "@/lib/vendor/format";
import { datesLine, whenLine } from "@/lib/vendor/cleanEvent";
import { eventWebUrl } from "@/lib/vendor/eventContact";
import Panel from "./Panel";

/** Database listings only. Applications, inbox and activity are not stored yet. */
export default function HostDashboard({
  events,
  error,
}: {
  events: EventRow[];
  error?: string;
}) {
  // The sidebar's Events menu links here with ?event=<id>. A click in the list
  // below overrides that until the address names a different event.
  const linkedId = useSearchParams().get("event");
  const [picked, setPicked] = useState<{ id: string; whileLinked: string | null } | null>(null);
  const selectedId = picked && picked.whileLinked === linkedId ? picked.id : linkedId;
  const setSelectedId = (id: string) => setPicked({ id, whileLinked: linkedId });
  const selected =
    events.find((event) => event.id === selectedId) ?? events[0] ?? null;
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Dashboard
          </h1>
          <p className="mt-1 text-neutral-600">Manage event listings.</p>
        </div>
        <Link
          href="/host/dashboard/create"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <FilePlus className="size-4" aria-hidden />
          Add event
        </Link>
      </header>
      {error ? (
        <div className="mt-8">
          <VendorNotice title="Couldn't load events" tone="error">
            <p>{error}</p>
          </VendorNotice>
        </div>
      ) : !selected ? (
        <div className="mt-8">
          <VendorNotice title="No events yet">
            <p>
              Published events will appear here. Add an event to get started.
            </p>
          </VendorNotice>
        </div>
      ) : (
        <>
          <section aria-labelledby="events-heading" className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2
                id="events-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Published events
              </h2>
              <p className="text-[13px] text-neutral-500">
                {events.length} {events.length === 1 ? "event" : "events"} ·
                earliest date first
              </p>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              All published events in the shared event catalog.
            </p>
            <ul className="mt-3 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
              {events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    aria-pressed={event.id === selected.id}
                    className={`flex w-full flex-wrap items-start justify-between gap-3 px-5 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 ${event.id === selected.id ? "bg-emerald-50 shadow-[inset_3px_0_0_var(--color-emerald-700)]" : "hover:bg-neutral-50"}`}
                  >
                    <span className="min-w-0 flex-1 basis-52">
                      <span className="block text-[15px] font-semibold text-neutral-950">
                        {event.name}
                      </span>
                      <span className="mt-1 flex items-start gap-1.5 text-sm text-neutral-600">
                        <CalendarDays
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden
                        />
                        {whenLine(event) ?? "Dates not listed"}
                      </span>
                      <span className="mt-1 flex items-start gap-1.5 text-sm text-neutral-500">
                        <MapPin
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden
                        />
                        {[event.venue, formatLocation(event)]
                          .filter(Boolean)
                          .join(" · ") || "Location not listed"}
                      </span>
                    </span>
                    <span className="text-sm text-neutral-500">
                      <span className="block font-semibold text-neutral-950">
                        {formatBoothFee(event) ?? "Fee not listed"}
                      </span>
                      <span className="mt-1 block">
                        Deadline:{" "}
                        {formatDate(event.application_deadline) ?? "Not listed"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="selected-event-heading" className="mt-9">
            <h2
              id="selected-event-heading"
              className="text-xl font-semibold tracking-tight"
            >
              {selected.name}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {EVENT_TYPE_LABELS[selected.event_type] ?? selected.event_type}
            </p>
            <div className="mt-4 grid items-start gap-6 lg:grid-cols-2">
              <Panel title="Event details">
                <Facts
                  rows={[
                    ["Dates", datesLine(selected)],
                    ["Venue", selected.venue],
                    ["Location", formatLocation(selected)],
                    ["Schedule", selected.schedule_notes],
                    [
                      "Expected attendance",
                      number(selected.expected_attendance),
                    ],
                    ["Attendance source", selected.attendance_source],
                    ["Additional details", selected.notes],
                  ]}
                />
              </Panel>
              <Panel title="Vendor information">
                <Facts
                  rows={[
                    ["Booth fee", formatBoothFee(selected)],
                    ["Fee information year", number(selected.fee_info_year)],
                    [
                      "Application deadline",
                      formatDate(selected.application_deadline),
                    ],
                    ["Application fee", money(selected.application_fee)],
                    ["Electricity fee", money(selected.electricity_fee)],
                    [
                      "Share of sales",
                      selected.fee_pct_of_sales == null
                        ? null
                        : `${selected.fee_pct_of_sales}%`,
                    ],
                    ["Fee notes", selected.fee_notes],
                    ["Vendor spots", number(selected.vendor_spots)],
                    ["Booth size", selected.booth_size],
                    ["Similar vendor limit", selected.similar_vendor_limit],
                  ]}
                />
              </Panel>
              <Panel title="Application and contact">
                <Facts
                  rows={[
                    ["How to apply", selected.how_to_apply],
                    ["Organizer email", selected.organizer_email],
                  ]}
                />
                <div className="mt-4 flex flex-wrap gap-4">
                  <SourceLink value={selected.apply_url}>
                    Application link
                  </SourceLink>
                  <SourceLink value={selected.source_url}>
                    Event source
                  </SourceLink>
                </div>
              </Panel>
              <Panel title="Listing details">
                <Facts
                  rows={[
                    ["Added", formatDate(selected.created_at)],
                    ["Last updated", formatDate(selected.updated_at)],
                    [
                      "Listing method",
                      selected.created_via === "extractor"
                        ? "From an event source"
                        : "Entered manually",
                    ],
                  ]}
                />
              </Panel>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const number = (value: number | null) =>
  value == null ? null : value.toLocaleString("en-US", { useGrouping: false });
const money = (value: number | null) =>
  value == null
    ? null
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
function Facts({ rows }: { rows: [string, string | null][] }) {
  return (
    <dl className="-my-2 divide-y divide-neutral-100 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="text-neutral-500">{label}</dt>
          <dd className="whitespace-pre-wrap break-words text-neutral-900">
            {value ?? "Not listed"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function SourceLink({
  value,
  children,
}: {
  value: string | null;
  children: React.ReactNode;
}) {
  const url = eventWebUrl(value);
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="size-4" aria-hidden />
    </a>
  ) : null;
}
