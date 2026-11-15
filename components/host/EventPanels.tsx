import { Circle, CircleCheck } from "lucide-react";
import VendorNotice from "@/components/vendor/VendorNotice";
import { CATEGORY_LABELS, completenessNote, crowdingNote, feeComparison } from "@/lib/host/labels";
import { applyRate, feePerAttendee, listingChecklist, vendorMix } from "@/lib/host/metrics";
import type { HostEvent } from "@/lib/host/types";
import Panel, { Meter } from "./Panel";

/** The four panels for the selected event. All four are plain markup over lib/host. */
export default function EventPanels({ hostEvent }: { hostEvent: HostEvent }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <VendorMixPanel hostEvent={hostEvent} />
      <VendorViewPanel hostEvent={hostEvent} />
      <CompletenessPanel hostEvent={hostEvent} />
      <ActivityPanel hostEvent={hostEvent} />
    </div>
  );
}

const footnote = "mt-4 border-t border-neutral-200 pt-3 text-[13px] leading-relaxed text-neutral-600";

/** Accepted vendors per category against the organizer's limit, and what crowding costs. */
function VendorMixPanel({ hostEvent }: { hostEvent: HostEvent }) {
  const rows = vendorMix(hostEvent);
  const note = crowdingNote(rows);
  const accepted = rows.reduce((total, row) => total + row.accepted, 0);

  return (
    <Panel title="Vendor mix" aside={`${accepted} accepted`}>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-600">No category limits are set and no vendors are accepted yet.</p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((row) => (
            <li key={row.category}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-neutral-950">{CATEGORY_LABELS[row.category]}</span>
                <span className="text-neutral-600 tabular-nums">
                  {row.limit === 0 ? (
                    <>{row.accepted} accepted · no limit set</>
                  ) : (
                    <>
                      {row.accepted} of {row.limit} ·{" "}
                      {row.full ? (
                        <span className="font-semibold text-neutral-950">Full</span>
                      ) : (
                        <>{row.open} open</>
                      )}
                    </>
                  )}
                </span>
              </div>
              <Meter value={row.accepted} max={row.limit} className="mt-2" />
            </li>
          ))}
        </ul>
      )}
      {note && <p className={footnote}>{note}</p>}
    </Panel>
  );
}

/** Fit score ranges, rating totals, returning-vendor rate and fee per attendee. */
function VendorViewPanel({ hostEvent }: { hostEvent: HostEvent }) {
  const { event, ratings, returningVendorRate, fitRanges } = hostEvent;
  const fee = event.booth_fee_min ?? event.booth_fee_max;

  return (
    <Panel
      title="How vendors see your event"
      aside={
        ratings ? `${ratings.reports} ${ratings.reports === 1 ? "report" : "reports"}` : "No reports yet"
      }
    >
      <dl className="-my-2 divide-y divide-neutral-100 text-sm">
        {fitRanges.map((range) => (
          <Fact
            key={range.vendorType}
            label={`Fit score, ${range.vendorType.toLowerCase()}`}
            value={`${range.low}–${range.high}`}
          />
        ))}
        <Fact label="Audience fit" value={ratings ? `${ratings.audienceFit.toFixed(1)} / 5` : null} />
        <Fact label="Organization" value={ratings ? `${ratings.organization.toFixed(1)} / 5` : null} />
        <Fact
          label="Returning vendors"
          value={returningVendorRate != null ? `${Math.round(returningVendorRate * 100)}%` : null}
        />
      </dl>
      <p className={footnote}>
        {feeComparison({
          fee,
          perAttendee: feePerAttendee(event),
          countyMedian: hostEvent.countyMedianFeePerAttendee,
          county: event.county,
        })}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">
        {ratings
          ? "Ratings are totals only. Individual vendor reports are never shared."
          : "Until vendors report, they see scores estimated from public data."}
      </p>
    </Panel>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-neutral-600">{label}</dt>
      <dd className={value ? "font-semibold text-neutral-950 tabular-nums" : "text-neutral-500"}>
        {value ?? "Not yet"}
      </dd>
    </div>
  );
}

/** Which details are filled in, and what the gaps mean for vendors' scores. */
function CompletenessPanel({ hostEvent }: { hostEvent: HostEvent }) {
  const items = listingChecklist(hostEvent);
  const done = items.filter((item) => item.done).length;
  const note = completenessNote(items);

  return (
    <Panel title="Listing completeness" aside={`${done} of ${items.length} added`}>
      <ul className="space-y-2.5 text-sm">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5">
            {item.done ? (
              <CircleCheck className="size-[18px] shrink-0 text-emerald-700" strokeWidth={1.75} aria-hidden />
            ) : (
              <Circle className="size-[18px] shrink-0 text-neutral-300" strokeWidth={1.75} aria-hidden />
            )}
            <span className={item.done ? "text-neutral-600" : "font-semibold text-neutral-950"}>
              {item.label}
            </span>
            <span className="ml-auto text-[13px] text-neutral-500">{item.done ? "Added" : "Missing"}</span>
          </li>
        ))}
      </ul>
      {note.tone === "warning" ? (
        // Missing attendance changes what vendors see, so it gets the amber box.
        <div className="mt-4">
          <VendorNotice title={note.title} tone="warning">
            <p>{note.body}</p>
          </VendorNotice>
        </div>
      ) : (
        <p className={footnote}>
          <span className="font-semibold text-neutral-950">{note.title}.</span> {note.body}
        </p>
      )}
    </Panel>
  );
}

/** Views, saves and Apply clicks for the listing. */
function ActivityPanel({ hostEvent }: { hostEvent: HostEvent }) {
  const { activity } = hostEvent;
  const rate = applyRate(activity);
  const figures: [label: string, meaning: string, value: number][] = [
    ["Views", "Vendors who opened your listing", activity.views],
    ["Saves", "Vendors who bookmarked it", activity.saves],
    ["Apply clicks", "Vendors who went on to your application", activity.applyClicks],
  ];

  return (
    <Panel title="Listing activity" aside="Last 30 days">
      <dl className="-my-2 divide-y divide-neutral-100 text-sm">
        {figures.map(([label, meaning, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2">
            <dt>
              <span className="block text-neutral-600">{label}</span>
              <span className="block text-xs text-neutral-500">{meaning}</span>
            </dt>
            <dd className="text-[15px] font-semibold text-neutral-950 tabular-nums">
              {value.toLocaleString("en-US")}
            </dd>
          </div>
        ))}
      </dl>
      <p className={footnote}>
        {rate == null
          ? "No views yet. Activity shows up once vendors find your listing."
          : `${(rate * 100).toFixed(1)}% of views led to an Apply click.`}
      </p>
    </Panel>
  );
}
