"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EventRow } from "@/lib/types";
import SearchBar from "@/components/ui/SearchBar";
import VendorNotice, { SampleTag } from "@/components/vendor/VendorNotice";
import { searchEvents } from "@/lib/vendor/eventSearch";
import { formatDateRange, formatLocation } from "@/lib/vendor/format";
import { DEFAULT_BRAND_PROFILE, useBrandProfile } from "@/lib/vendor/storage";
import { climateForEvent } from "@/lib/scoring/climateData";
import {
  PROJECTION_MODEL_VERSION,
  SCENARIOS,
  describeFeeRule,
  projectEvent,
  type Confidence,
  type EventProjection,
  type ProjectionResult,
} from "@/lib/scoring/projection";

/**
 * Round for display only (spec §4: no fake precision). Under $100 → nearest
 * dollar; otherwise nearest $10. The math keeps full precision.
 */
function money(n: number) {
  const r = Math.abs(n) < 100 ? Math.round(n) : Math.round(n / 10) * 10;
  const s = `$${Math.abs(r).toLocaleString("en-US")}`;
  return r < 0 ? `−${s}` : s;
}

const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  High: "bg-emerald-50 text-emerald-800",
  Medium: "bg-sky-50 text-sky-800",
  Low: "bg-amber-50 text-amber-900",
  "Insufficient data": "bg-neutral-100 text-neutral-600",
};

type Row = { event: EventRow; p: EventProjection };

/**
 * Every event ranked by projected net profit (base case) for the brand's saved
 * numbers. Recomputes instantly on the client when the numbers change.
 */
export default function EventProjections({
  events,
  isSampleData,
}: {
  events: EventRow[];
  isSampleData: boolean;
}) {
  const [stored] = useBrandProfile();
  const brand = stored ?? DEFAULT_BRAND_PROFILE;

  const [query, setQuery] = useState("");
  const { ranked, unavailable } = useMemo(() => {
    const rows: Row[] = searchEvents(events, query).map((event) => ({
      event,
      p: projectEvent(event, brand, climateForEvent(event)),
    }));
    const ok = rows.filter((r) => r.p.scenarios.base.ok);
    const net = (r: Row) => (r.p.scenarios.base as ProjectionResult).netProfit;
    return {
      ranked: ok.sort((a, b) => net(b) - net(a)),
      unavailable: rows.filter((r) => !r.p.scenarios.base.ok),
    };
  }, [events, brand, query]);

  if (events.length === 0) {
    return (
      <VendorNotice title="No events to project yet">
        <p>Projections appear here as soon as events are added to the database.</p>
      </VendorNotice>
    );
  }

  return (
    <section aria-labelledby="projections-heading" className="space-y-4">
      <div>
        <h2 id="projections-heading" className="text-xl font-semibold tracking-tight text-neutral-950">
          Projected profit by event
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Ranked by the base case for {stored ? "your saved numbers" : "the example numbers above"}.
          These are projections from public data and your inputs, not guaranteed earnings.
        </p>
        {isSampleData && (
          <p className="mt-2 text-sm text-amber-900">
            The database isn&apos;t connected, so these are made-up Sample events.
          </p>
        )}
      </div>

      {events.length > 1 && (
        <SearchBar
          value={query}
          onChange={setQuery}
          label="Search projected events"
          placeholder="Search events by name, place, date, fee…"
          shown={ranked.length + unavailable.length}
          total={events.length}
        />
      )}
      {query.trim() && ranked.length + unavailable.length === 0 && (
        <VendorNotice title="No events match that search">
          <p>Try fewer words, or clear the search to see all {events.length}.</p>
        </VendorNotice>
      )}

      <ul className="space-y-3">
        {ranked.map((r) => (
          <ProjectionCard key={r.event.id} row={r} />
        ))}
      </ul>

      {unavailable.length > 0 && (
        <div className="pt-2">
          <h3 className="text-sm font-semibold text-neutral-950">
            Projection unavailable ({unavailable.length})
          </h3>
          <p className="text-sm text-neutral-500">
            These listings are missing an input the math needs. Nothing is guessed.
          </p>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {unavailable.map(({ event, p }) => {
              const base = p.scenarios.base;
              const missing = base.ok ? [] : [...base.missing, ...base.invalid];
              return (
                <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-medium text-neutral-900">
                    {event.name} {event.is_sample && <SampleTag />}
                  </span>
                  <span className="text-neutral-500">Add: {missing.join(", ")}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-neutral-400">
        Model {PROJECTION_MODEL_VERSION}. Scenarios are sensitivity ranges, not statistical
        confidence intervals.
      </p>
    </section>
  );
}

function ProjectionCard({ row: { event, p } }: { row: Row }) {
  const base = p.scenarios.base as ProjectionResult;
  const low = p.scenarios.conservative as ProjectionResult;
  const high = p.scenarios.optimistic as ProjectionResult;
  const where = formatLocation(event);
  const when = formatDateRange(event.start_date, event.end_date);
  const positive = base.netProfit >= 0;
  const be = p.breakEven;

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-neutral-950">
            {event.name} {event.is_sample && <SampleTag />}
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">
            {[when, where].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${CONFIDENCE_STYLE[p.confidence]}`}>
              {p.confidence} confidence
            </span>
            {p.fit && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                Fit {p.fit.score}/100
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Projected profit</p>
          <p className={`text-2xl font-semibold tracking-tight ${positive ? "text-emerald-700" : "text-red-700"}`}>
            {money(base.netProfit)}
          </p>
          <p className="text-xs text-neutral-500">
            Range {money(low.netProfit)} to {money(high.netProfit)}
          </p>
        </div>
      </div>

      <details className="group border-t border-neutral-200">
        <summary className="flex cursor-pointer list-none items-center gap-1 px-5 py-3 text-sm font-medium text-neutral-700 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-emerald-700">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          How this was calculated
        </summary>
        <div className="grid gap-6 px-5 pb-5 text-sm sm:grid-cols-2">
          <dl className="space-y-1.5">
            <Line label="Projected sales" value={`${Math.round(base.transactions).toLocaleString("en-US")}${base.capacityLimited ? " (booth capacity limit)" : ""}`} />
            <Line label="Gross revenue" value={money(base.grossRevenue)} />
            <Line label="Ingredients & packaging" value={`−${money(base.costOfGoods)}`} />
            <Line label="Organizer fee" value={`−${money(base.organizerFee)}`} />
            {base.eventFees - base.organizerFee > 0 && (
              <Line label="Application & power fees" value={`−${money(base.eventFees - base.organizerFee)}`} />
            )}
            <Line label="Your other costs" value={`−${money(base.totalCosts - base.costOfGoods - base.eventFees)}`} />
            <Line label="Projected profit" value={money(base.netProfit)} strong />
            <p className="pt-1 text-neutral-500">
              Fee rule: {describeFeeRule(p.feeRule)}
              {event.fee_info_year ? ` (${event.fee_info_year} terms)` : ""}.
            </p>
            <p className="text-neutral-500">
              {be.reachable
                ? `Break-even: about ${be.transactions.toLocaleString("en-US")} sales${
                    be.requiredPurchaseRate != null
                      ? `, a ${pct(be.requiredPurchaseRate)} category purchase rate${be.requiredPurchaseRate > 1 ? " (not attainable)" : ""}`
                      : ""
                  }.`
                : `Break-even: ${be.reason}.`}
            </p>
          </dl>
          <div>
            <p className="font-medium text-neutral-950">Assumptions</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-neutral-600">
              <li>
                Attendance {event.expected_attendance?.toLocaleString("en-US")}
                {event.attendance_source ? ` (${event.attendance_source})` : " (source not stated)"}; base case
                assumes {pct(SCENARIOS.base.attendanceAdjustment)} of it is reachable.
              </li>
              <li>
                An estimated {pct(p.purchaseRate)} of attendees buy something like yours from any vendor
                (from attendance, event type and your product), split among an estimated {p.competitors} competitor
                {p.competitors === 1 ? "" : "s"}
                {p.competitorBasis === "listed"
                  ? ` (the event lists ${p.totalVendors} vendor spots)`
                  : " (worked out from attendance, event type and weather)"}
                .
              </li>
              <li>
                {p.weather.applied && p.weather.highC != null
                  ? `Weather: typical high of ${Math.round((p.weather.highC * 9) / 5 + 32)}°F in the event's month, so sales are scaled by ${p.weather.multiplier.toFixed(2)}× for ${p.weather.productType} drinks.`
                  : `Weather not applied: ${p.weather.reason.replace(/, so weather isn't applied$/, "")}.`}
              </li>
              <li>
                {p.days} day{p.days === 1 ? "" : "s"}{p.daysAssumed ? " (assumed: no dates listed)" : ""} × {p.sellingHoursPerDay} selling hours,
                up to {p.transactionsPerHour} sales/hour.
              </li>
              {p.confidenceReasons.map((reason) => (
                <li key={reason}>{reason}.</li>
              ))}
              {p.fit?.usesPlaceholderRatings && <li>Fit score uses neutral placeholder ratings (no vendor reports yet).</li>}
            </ul>
            {event.source_url && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block font-medium text-emerald-700 hover:text-emerald-800"
              >
                Source listing ↗
              </a>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-neutral-200 pt-1.5 font-semibold text-neutral-950" : "text-neutral-700"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
