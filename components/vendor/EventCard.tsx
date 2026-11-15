"use client";

import { Bookmark, ExternalLink } from "lucide-react";
import type { EventRow } from "@/lib/types";
import {
  EVENT_TYPE_LABELS,
  dateParts,
  feeSummary,
  formatDate,
  formatDateRange,
} from "@/lib/vendor/format";
import { SampleTag } from "./VendorNotice";

/**
 * One event as a list row: date block, name and facts, booth fee, save.
 * Clicking the row selects it (the Explore page focuses the map on it).
 * Save and the outbound link are separate controls layered above the row.
 */
export default function EventCard({
  event,
  selected = false,
  saved,
  onMap = true,
  onSelect,
  onToggleSave,
}: {
  event: EventRow;
  selected?: boolean;
  saved: boolean;
  /** false = the event has no usable location, so it has no marker. */
  onMap?: boolean;
  onSelect?: (id: string) => void;
  onToggleSave: (id: string) => void;
}) {
  const date = dateParts(event.start_date);
  const fee = feeSummary(event);
  const money = (n: number) => "$" + n.toLocaleString("en-US");
  const deadline = formatDate(event.application_deadline);
  const link = event.apply_url ?? event.source_url;

  const where = [
    // No single date (a weekly market, or a source that gave none): show its schedule instead.
    formatDateRange(event.start_date, event.end_date) ?? event.schedule_notes,
    event.venue,
    event.city ?? (event.county ? `${event.county.replace(/\s+county$/i, "")} County` : null),
  ]
    .filter(Boolean)
    .join(" · ");
  const facts = [
    EVENT_TYPE_LABELS[event.event_type] ?? event.event_type,
    event.expected_attendance != null &&
      `${event.expected_attendance.toLocaleString("en-US")} expected`,
    deadline && `Apply by ${deadline}`,
    !onMap && "Not on map",
  ].filter(Boolean);
  // Costs and terms a vendor needs before applying, when the listing has them.
  const terms = [
    event.booth_size && `Booth ${event.booth_size}`,
    event.electricity_fee != null && `Electricity ${money(event.electricity_fee)}`,
    event.application_fee != null && `Application fee ${money(event.application_fee)}`,
    event.vendor_spots != null && `${event.vendor_spots.toLocaleString("en-US")} vendor spots`,
    event.fee_info_year != null && `${event.fee_info_year} fees`,
  ].filter(Boolean);
  const more: [label: string, text: string | null][] = [
    ["Fees", event.fee_notes],
    ["How to apply", event.how_to_apply],
    ["Requirements", event.notes],
    ["Vendor limits", event.similar_vendor_limit],
  ];
  const details = more.filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <article
      data-event-id={event.id}
      className={`relative flex gap-4 px-5 py-4 transition-colors ${
        selected
          ? "bg-emerald-50 shadow-[inset_3px_0_0_var(--color-emerald-700)]"
          : "hover:bg-neutral-50"
      }`}
    >
      <div className="w-11 shrink-0 pt-0.5 text-center" aria-hidden>
        {date ? (
          <>
            <div className="text-[11px] font-semibold tracking-wide text-emerald-700">{date.month}</div>
            <div className="text-xl leading-6 font-semibold text-neutral-950">{date.day}</div>
            <div className="text-[11px] text-neutral-500">{date.weekday}</div>
          </>
        ) : (
          <div className="pt-2 text-[11px] font-semibold tracking-wide text-neutral-400">TBD</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[15px] leading-snug font-semibold text-neutral-950">
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(event.id)}
                className="text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-emerald-700"
              >
                {event.name}
              </button>
            ) : (
              event.name
            )}
          </h3>
          {event.is_sample && <SampleTag />}
        </div>
        <p className="mt-0.5 text-sm text-neutral-600">{where || "Date and location not listed"}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-neutral-500">
          <span>{facts.join(" · ")}</span>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 ml-1 inline-flex items-center gap-1 rounded font-medium text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {event.apply_url ? "Apply" : "Source"}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </p>
        {terms.length > 0 && <p className="mt-1 text-[13px] text-neutral-500">{terms.join(" · ")}</p>}
        {details.length > 0 && (
          <details className="relative z-10 mt-1.5 text-[13px] text-neutral-600">
            <summary className="w-fit cursor-pointer rounded font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
              More details
            </summary>
            <dl className="mt-1.5 space-y-1.5">
              {details.map(([label, text]) => (
                <div key={label}>
                  <dt className="font-medium text-neutral-900">{label}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-2">
        <div className="pt-0.5 text-right">
          <div className={`text-[15px] font-semibold ${fee ? "text-neutral-950" : "text-neutral-400"}`}>
            {fee?.value ?? "—"}
          </div>
          <div className="text-xs text-neutral-500">{fee?.label ?? "fee not listed"}</div>
        </div>
        <button
          type="button"
          onClick={() => onToggleSave(event.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${event.name} from saved` : `Save ${event.name}`}
          className="relative z-10 -mt-1 -mr-2 grid size-9 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          <Bookmark
            className={`size-[18px] ${saved ? "fill-emerald-700 text-emerald-700" : ""}`}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </div>
    </article>
  );
}
