import { SampleTag } from "@/components/vendor/VendorNotice";
import { deadlineLabel } from "@/lib/host/labels";
import { boothsFilled, daysUntil, pipelineCounts } from "@/lib/host/metrics";
import type { HostEvent } from "@/lib/host/types";
import { dateParts, formatDateRange } from "@/lib/vendor/format";
import { Meter } from "./Panel";

/**
 * The organizer's events, one row each: date block, name and place, then the
 * application pipeline, booths filled and days left to apply. Built like the
 * vendor dashboard's EventCard (same date block, type sizes and selected state)
 * so the two sides read the same. Clicking a row selects it.
 */
export default function EventsList({
  events,
  selectedId,
  today,
  onSelect,
}: {
  events: HostEvent[];
  selectedId: string | null;
  /** Today's date as YYYY-MM-DD. */
  today: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
      {events.map((hostEvent) => {
        const { event } = hostEvent;
        const selected = event.id === selectedId;
        const date = dateParts(event.start_date);
        const counts = pipelineCounts(hostEvent.applicants);
        const booths = boothsFilled(hostEvent);
        const deadline = deadlineLabel(daysUntil(event.application_deadline, today));
        const where = [formatDateRange(event.start_date, event.end_date), event.venue, event.city]
          .filter(Boolean)
          .join(" · ");

        return (
          <li key={event.id}>
            <article
              // @container: the numbers sit beside the name when the row is wide
              // enough (@4xl) and wrap underneath it when it is not.
              className={`@container relative flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4 transition-colors ${
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

              <div className="min-w-0 flex-1 basis-52">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-[15px] leading-snug font-semibold text-neutral-950">
                    <button
                      type="button"
                      onClick={() => onSelect(event.id)}
                      aria-pressed={selected}
                      className="text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-emerald-700"
                    >
                      {event.name}
                    </button>
                  </h3>
                  {event.is_sample && <SampleTag />}
                </div>
                <p className="mt-0.5 text-sm text-neutral-600">{where || "Date and location not listed"}</p>
              </div>

              <div className="flex w-full flex-wrap items-start gap-x-6 gap-y-3 pt-0.5 @md:pl-[3.75rem] @4xl:w-auto @4xl:shrink-0 @4xl:pl-0">
                <dl className="flex gap-x-2">
                  <Stat value={counts.new} caption="new" accent />
                  <Stat value={counts.accepted} caption="accepted" />
                  <Stat value={counts.waitlisted} caption="waitlisted" />
                  <Stat value={counts.declined} caption="declined" />
                </dl>

                <dl className="flex items-start gap-x-6">
                  <div className="flex w-28 flex-col-reverse">
                    <dt className="text-xs text-neutral-500">booths filled</dt>
                    <dd>
                      <span className="text-[15px] font-semibold text-neutral-950 tabular-nums">
                        {booths.filled} / {booths.total}
                      </span>
                    </dd>
                    <Meter value={booths.filled} max={booths.total} className="order-first mt-1.5" />
                  </div>

                  <div className="flex w-28 flex-col-reverse @4xl:text-right">
                    <dt className="text-xs text-neutral-500">{deadline.caption}</dt>
                    <dd
                      className={`text-[15px] font-semibold tabular-nums ${
                        deadline.urgent
                          ? "text-amber-700"
                          : deadline.value === "—" || deadline.value === "Closed"
                            ? "text-neutral-500"
                            : "text-neutral-950"
                      }`}
                    >
                      {deadline.value}
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** One pipeline number with its status underneath. Zero is greyed so real counts stand out. */
function Stat({ value, caption, accent = false }: { value: number; caption: string; accent?: boolean }) {
  // neutral-500, not 400: a zero is still information, so it keeps readable contrast.
  const color = value === 0 ? "text-neutral-500" : accent ? "text-emerald-700" : "text-neutral-950";
  return (
    <div className="flex w-[4.25rem] flex-col-reverse">
      <dt className="text-xs text-neutral-500">{caption}</dt>
      <dd className={`text-[15px] font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}
