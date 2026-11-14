"use client";

import {
  Bookmark,
  CalendarDays,
  ExternalLink,
  Flag,
  MapPin,
  MapPinOff,
  PartyPopper,
  Store,
  Tent,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { EventRow } from "@/lib/types";
import {
  EVENT_TYPE_LABELS,
  formatBoothFee,
  formatDate,
  formatDateRange,
  formatLocation,
} from "@/lib/vendor/format";

const TYPE_STYLE: Record<string, { icon: LucideIcon; band: string }> = {
  fair: { icon: Tent, band: "from-orange-500/30 to-rose-500/10" },
  race: { icon: Flag, band: "from-sky-500/30 to-indigo-500/10" },
  market: { icon: Store, band: "from-emerald-500/30 to-teal-500/10" },
  festival: { icon: PartyPopper, band: "from-fuchsia-500/30 to-purple-500/10" },
  street_fair: { icon: Store, band: "from-amber-500/30 to-orange-500/10" },
  other: { icon: MapPin, band: "from-neutral-500/30 to-neutral-500/10" },
};

/**
 * One event in a list. Clicking the card body selects it (the Explore page
 * focuses the map on it). Save and the outbound link are separate controls.
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
  /** false = the event has no usable location, so it has no pin. */
  onMap?: boolean;
  onSelect?: (id: string) => void;
  onToggleSave: (id: string) => void;
}) {
  const style = TYPE_STYLE[event.event_type] ?? TYPE_STYLE.other;
  const Icon = style.icon;
  const dates = formatDateRange(event.start_date, event.end_date);
  const fee = formatBoothFee(event);
  const location = formatLocation(event);
  const deadline = formatDate(event.application_deadline);
  const link = event.apply_url ?? event.source_url;

  return (
    <article
      data-event-id={event.id}
      className={`group relative overflow-hidden rounded-xl border bg-neutral-900 transition-all duration-150 ${
        selected
          ? "border-orange-400 shadow-[0_0_0_1px_var(--color-orange-400)]"
          : "border-neutral-800 hover:border-neutral-600"
      }`}
    >
      <div className={`flex h-16 items-center justify-between bg-gradient-to-br px-4 ${style.band}`}>
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-200">
          <Icon className="size-4" aria-hidden />
          {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
        </span>
        <div className="flex items-center gap-2">
          {/* MASTER.md §6: made-up rows must be visibly labeled. */}
          {event.is_sample && (
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-xs font-semibold text-amber-300">
              Sample
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleSave(event.id)}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${event.name} from saved` : `Save ${event.name}`}
            className="relative z-10 grid size-9 place-items-center rounded-full bg-neutral-950/50 text-neutral-200 transition-colors hover:bg-neutral-950/80 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <Bookmark
              className={`size-4 ${saved ? "fill-emerald-400 text-emerald-400" : ""}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold leading-snug">
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(event.id)}
              className="text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-emerald-400"
            >
              {event.name}
            </button>
          ) : (
            event.name
          )}
        </h3>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-neutral-300">
          <Fact icon={CalendarDays} label="Dates" value={dates ?? "Date not listed"} muted={!dates} />
          <Fact
            icon={onMap ? MapPin : MapPinOff}
            label="Location"
            value={location ?? "Location not listed"}
            muted={!location}
          />
          <Fact icon={Ticket} label="Booth fee" value={fee ?? "Fee not listed"} muted={!fee} />
          {event.expected_attendance != null && (
            <Fact
              icon={Users}
              label="Expected attendance"
              value={`${event.expected_attendance.toLocaleString("en-US")} expected`}
            />
          )}
        </dl>

        {(deadline || link) && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-800 pt-3 text-sm">
            <span className="text-neutral-400">{deadline && `Apply by ${deadline}`}</span>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 inline-flex items-center gap-1 rounded font-medium text-emerald-400 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                {event.apply_url ? "Apply" : "Source"}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className={muted ? "text-neutral-500" : ""}>{value}</dd>
    </div>
  );
}
