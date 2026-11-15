import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SAMPLE_EVENTS } from "@/lib/vendor/sampleEvents";
import type { EventRow } from "@/lib/types";
import { cleanEvent, datesLine } from "@/lib/vendor/cleanEvent";
import {
  EVENT_TYPE_LABELS,
  formatBoothFee,
  formatDate,
  formatLocation,
} from "@/lib/vendor/format";
import {
  eventWebUrl,
  organizerEmail,
  organizerMailto,
} from "@/lib/vendor/eventContact";
import VendorNotice, { SampleTag } from "@/components/vendor/VendorNotice";
import EventDetailActions from "@/components/vendor/EventDetailActions";
import EventProjections from "@/components/fit/EventProjections";

export const metadata = { title: "Event details" };
type Props = { params: Promise<{ id: string }> };

export default function EventPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-8 text-neutral-500">Loading event…</p>}>
      <EventDetail params={params} />
    </Suspense>
  );
}

async function EventDetail({ params }: Props) {
  await connection();
  const { id } = await params;
  let event: (EventRow & { organizer_email?: string | null }) | null = null;
  if (isSupabaseConfigured) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      notFound();
    const result = await getSupabaseClient()!
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (result.error)
      return (
        <div className="p-8">
          <VendorNotice title="Couldn't load this event" tone="error">
            <p>Please try again shortly.</p>
          </VendorNotice>
          <Link href="/vendor" className="mt-4 inline-block underline">
            Back to events
          </Link>
        </div>
      );
    event = result.data;
  } else {
    event = SAMPLE_EVENTS.find((e) => e.id === id) ?? null;
  }
  if (!event) notFound();
  // Imported listings keep dates, venue and notes as text; turn them into fields.
  event = cleanEvent(event, new Date().toISOString().slice(0, 10));
  const applyUrl = eventWebUrl(event.apply_url);
  const sourceUrl = eventWebUrl(event.source_url);
  const email = organizerEmail(event.organizer_email);
  const mailto = organizerMailto(email, event.name);
  const money = (n: number | null) =>
    n == null
      ? null
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(n);
  const count = (n: number | null) =>
    n == null ? null : n.toLocaleString("en-US");
  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-10">
      <Link
        href="/vendor"
        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to events
      </Link>
      <header className="mt-6 border-b border-neutral-200 pb-7">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-emerald-700">
          <span>{EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}</span>
          {event.is_sample && <SampleTag />}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
          {event.name}
        </h1>
        <p className="mt-3 text-neutral-600">
          {datesLine(event) ?? "Dates not listed"}{" "}
          · {formatLocation(event) ?? "Location not listed"}
        </p>
        <div className="mt-5">
          <EventDetailActions id={event.id} />
        </div>
      </header>
      <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-7">
          <Details
            title="About the event"
            rows={[
              ["Venue", event.venue],
              ["City", event.city],
              ["County", event.county],
              ["Starts", formatDate(event.start_date)],
              ["Ends", formatDate(event.end_date)],
              ["Schedule", event.schedule_notes],
              ["Day type", event.day_type],
              ["Expected attendance", count(event.expected_attendance)],
              ["Attendance source", event.attendance_source],
              ["Additional details", event.notes],
            ]}
          />
          <Details
            title="Vendor information"
            rows={[
              ["Booth fee", formatBoothFee(event)],
              ["Fee information year", event.fee_info_year?.toString()],
              ["Application fee", money(event.application_fee)],
              ["Electricity fee", money(event.electricity_fee)],
              [
                "Share of sales",
                event.fee_pct_of_sales == null
                  ? null
                  : `${event.fee_pct_of_sales}%`,
              ],
              ["Fee notes", event.fee_notes],
              ["Booth size", event.booth_size],
              ["Vendor spots", count(event.vendor_spots)],
              ["Similar vendor limit", event.similar_vendor_limit],
            ]}
          />
          <section className="rounded-2xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold">How to apply</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-600">
              {event.how_to_apply ??
                "Application instructions have not been provided. Check the official event source for details."}
            </p>
            <p className="mt-3 text-sm">
              <strong>Application deadline:</strong>{" "}
              {formatDate(event.application_deadline) ?? "Not listed"}
            </p>
            {applyUrl && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${button} mt-4`}
              >
                Open application
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
          </section>
          <EventProjections events={[event]} isSampleData={event.is_sample} />
          <section className="border-t border-neutral-200 pt-5 text-sm text-neutral-500">
            <h2 className="font-semibold text-neutral-900">
              Source and listing information
            </h2>
            <p className="mt-2">
              Missing details are shown as “Not listed”. Confirm fees and
              availability with the organizer before applying.
            </p>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-emerald-700 underline"
              >
                Official event source
                <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
            <p className="mt-2">
              Last updated {formatDate(event.updated_at)} ·{" "}
              {event.created_via === "extractor"
                ? "Added from an event source"
                : "Entered manually"}
            </p>
          </section>
        </div>
        <aside className="order-first space-y-5 lg:order-none lg:sticky lg:top-6">
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm text-neutral-600">Booth fee</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatBoothFee(event) ?? "Not listed"}
            </p>
            <p className="mt-3 text-sm text-neutral-600">
              Application deadline: {formatDate(event.application_deadline) ?? "Not listed"}
            </p>
            {applyUrl && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${button} mt-5 w-full`}
              >
                Apply to this event
                <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
          </section>
          <section className="rounded-2xl border border-neutral-200 p-6">
            <Mail className="size-6 text-emerald-700" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">
              Contact the organizer
            </h2>
            {mailto ? (
              <>
                <p className="mt-2 break-words text-sm text-neutral-600">
                  Ask about availability, booth requirements, or your
                  application.
                </p>
                <a href={mailto} className={`${button} mt-4 w-full`}>
                  Message organizer
                </a>
                <p className="mt-3 break-all text-xs text-neutral-500">
                  {email}
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Opens your email app. Messages are sent by email.
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  The organizer hasn’t provided a contact email for this
                  listing.
                </p>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"
                  >
                    Find contact details on the event website
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Details({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | null | undefined][];
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <dl className="mt-4 divide-y divide-neutral-100">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-neutral-500">{label}</dt>
            <dd className="whitespace-pre-wrap break-words text-neutral-900">
              {value ?? "Not listed"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
