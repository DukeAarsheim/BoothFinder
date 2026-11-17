"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";
import type { EventRow } from "@/lib/types";
import { dateBlock, dateBlockLabel, whenLine } from "@/lib/vendor/cleanEvent";
import { EVENT_TYPE_LABELS, feeSummary, formatDate } from "@/lib/vendor/format";
import { climateForEvent } from "@/lib/scoring/climateData";
import { projectEvent } from "@/lib/scoring/projection";
import { useBrandProfile } from "@/lib/vendor/storage";
import { SampleTag } from "./VendorNotice";

/** Round for display only: under $100 to the dollar, otherwise the nearest $10. */
function roundedMoney(n: number) {
  const r = Math.abs(n) < 100 ? Math.round(n) : Math.round(n / 10) * 10;
  const s = "$" + Math.abs(r).toLocaleString("en-US");
  return r < 0 ? "−" + s : s;
}

/**
 * One event as a list row: date block, name and facts, booth fee, save.
 * Clicking the row opens its event detail page. Show on map selects its marker.
 * Save and the outbound link are separate controls layered above the row.
 * The bottom right shows the estimated profit from the Fit Calculator's numbers.
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
  const [stored] = useBrandProfile();
  // No saved numbers (the vendor skipped setup): no estimate on the card.
  const projection = useMemo(
    () => (stored ? projectEvent(event, stored, climateForEvent(event)) : null),
    [event, stored],
  );
  const date = dateBlock(event);
  const fee = feeSummary(event);
  const money = (n: number) => "$" + n.toLocaleString("en-US");
  const deadline = formatDate(event.application_deadline);
  const link = event.apply_url ?? event.source_url;

  const where = [
    // Dates, an expected window, or (for a weekly market) its schedule.
    whenLine(event),
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
    event.fee_pct_of_sales != null && `${event.fee_pct_of_sales}% sales cut`,
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
            <div className={`leading-6 font-semibold ${date.day === "est." ? "text-sm text-neutral-500" : "text-xl text-neutral-950"}`}>{date.day}</div>
            <div className="text-[11px] text-neutral-500">{date.weekday}</div>
          </>
        ) : (
          <div className="pt-2 text-[11px] font-semibold tracking-wide text-neutral-400">{dateBlockLabel(event)}</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[15px] leading-snug font-semibold text-neutral-950">
            <Link href={`/vendor/events/${encodeURIComponent(event.id)}`} className="text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-emerald-700">{event.name}</Link>
          </h3>
          {event.is_sample && <SampleTag />}
        </div>
        <p className="mt-0.5 text-sm text-neutral-600">{where || "Date and location not listed"}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-neutral-500">
          <span>{facts.join(" · ")}</span>
          {onSelect && onMap && <button type="button" onClick={() => onSelect(event.id)} className="relative z-10 ml-1 font-medium text-emerald-700 hover:underline">Show on map</button>}
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

      <div className="flex shrink-0 flex-col justify-between self-stretch">
      <div className="flex items-start gap-2">
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
      {projection && <ProfitEstimate projection={projection} />}
      </div>
    </article>
  );
}

/**
 * Estimated profit for this event (base case), from the numbers saved on the Fit
 * Calculator. Shown in the card's bottom right. Not clickable: the row link sits
 * underneath it.
 */
function ProfitEstimate({ projection }: { projection: ReturnType<typeof projectEvent> }) {
  const base = projection.scenarios.base;
  if (!base.ok) {
    const why = base.missing.includes("attendance")
      ? "needs attendance"
      : base.missing.includes("fee terms")
        ? "fee terms unclear"
        : "no estimate";
    return (
      <div className="mt-3 text-right" title="A profit estimate needs attendance and clear fee terms. Nothing is guessed.">
        <div className="text-[15px] font-semibold text-neutral-400">—</div>
        <div className="text-xs text-neutral-500">est. profit: {why}</div>
      </div>
    );
  }
  const low = projection.scenarios.conservative;
  const high = projection.scenarios.optimistic;
  const range =
    low.ok && high.ok ? `Range ${roundedMoney(low.netProfit)} to ${roundedMoney(high.netProfit)}. ` : "";
  return (
    <div
      className="mt-3 text-right"
      title={`${range}Base-case estimate from your Fit Calculator numbers (${projection.confidence} confidence). Not guaranteed earnings.`}
    >
      <div className={`text-[15px] font-semibold ${base.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
        {roundedMoney(base.netProfit)}
      </div>
      <div className="text-xs text-neutral-500">est. profit</div>
    </div>
  );
}
