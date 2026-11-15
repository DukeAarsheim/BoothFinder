"use client";

import { Bookmark, ExternalLink } from "lucide-react";
import type { EventRow } from "@/lib/types";
import {
  EVENT_TYPE_LABELS,
  dateParts,
  formatBoothFee,
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
  const fee = formatBoothFee(event);
  const deadline = formatDate(event.application_deadline);
  const link = event.apply_url ?? event.source_url;

  const where = [
    formatDateRange(event.start_date, event.end_date),
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
      </div>

      <div className="flex shrink-0 items-start gap-2">
        <div className="pt-0.5 text-right">
          <div className={`text-[15px] font-semibold ${fee ? "text-neutral-950" : "text-neutral-400"}`}>
            {fee ?? "—"}
          </div>
          <div className="text-xs text-neutral-500">{fee ? "booth fee" : "fee not listed"}</div>
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
