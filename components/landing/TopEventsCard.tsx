import { Suspense } from "react";
import { EXAMPLE_BRAND, loadTopEvents } from "@/lib/landing/topEvents";

type Row = {
  key: string;
  fit: string;
  name: string;
  meta: string;
  money: string;
  label: string;
  loss: boolean;
};

/**
 * Shown only if no real events can be loaded (no database, or none upcoming).
 * These are the app's labelled Sample events with example scores, and the
 * card says so.
 */
const EXAMPLE_ROWS: Row[] = [
  { key: "a", fit: "62", name: "Sample Downtown Evening Market", meta: "Apr 8 · San Luis Obispo · $60 fee", money: "$260", label: "est. profit", loss: false },
  { key: "b", fit: "40", name: "Sample Spring Street Fair", meta: "May 1–2 · San Luis Obispo · $175 fee", money: "$209", label: "est. profit", loss: false },
  { key: "c", fit: "20", name: "Sample County Summer Fair", meta: "Jul 21 – Aug 1 · Paso Robles · $900 fee", money: "−$424", label: "est. loss", loss: true },
];

const dollars = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US")}`;

/** Emerald is reserved for the primary button, so badges are neutral: darkest = best fit. */
const badge = (fit: string) => {
  const n = Number(fit);
  if (Number.isNaN(n)) return "bg-stone-100 text-stone-500";
  return n >= 60 ? "bg-neutral-950 text-white" : n >= 35 ? "bg-stone-200 text-stone-900" : "bg-stone-100 text-stone-700";
};

function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul>
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-3 border-b border-stone-100 px-4 py-2.5">
          <span className={`flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${badge(row.fit)}`}>
            <span className="text-base leading-none font-extrabold">{row.fit}</span>
            <span className="text-[8px] font-bold tracking-wider">FIT</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{row.name}</span>
            <span className="block truncate text-xs text-stone-600">{row.meta}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className={`block text-sm font-bold ${row.loss ? "text-red-700" : ""}`}>{row.money}</span>
            <span className="block text-[11px] text-stone-600">{row.label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const Footnote = ({ children }: { children: string }) => (
  <p className="bg-stone-50 px-4 py-2 text-[11px] text-stone-600">{children}</p>
);

/** Reads the listings on every request, so the card always shows current events. */
async function LiveRows() {
  const top = await loadTopEvents(3);
  if (top.length === 0) {
    return (
      <>
        <Rows rows={EXAMPLE_ROWS} />
        <Footnote>Example with sample events, estimated from public data</Footnote>
      </>
    );
  }
  const rows: Row[] = top.map((e) => ({
    key: e.id,
    fit: e.fit == null ? "–" : String(e.fit),
    name: e.name,
    meta: `${e.attendance.toLocaleString("en-US")} expected · ${e.meta}`,
    money: e.profit == null ? "–" : dollars(e.profit),
    label: e.profit == null ? "needs fee details" : e.profit < 0 ? "est. loss" : "est. profit",
    loss: e.profit != null && e.profit < 0,
  }));
  return (
    <>
      <Rows rows={rows} />
      <Footnote>Live listings, biggest expected crowds first. Estimated from public data.</Footnote>
    </>
  );
}

function Loading() {
  return (
    <>
      <ul aria-hidden>
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 border-b border-stone-100 px-4 py-2.5">
            <span className="h-10 w-11 shrink-0 rounded-lg bg-stone-100" />
            <span className="flex-1 space-y-1.5">
              <span className="block h-3.5 w-3/4 rounded bg-stone-100" />
              <span className="block h-3 w-1/2 rounded bg-stone-100" />
            </span>
          </li>
        ))}
      </ul>
      <Footnote>Loading current events…</Footnote>
    </>
  );
}

/**
 * The landing page's product preview: the most popular upcoming real events,
 * scored for an example brand. The frame is static; the rows stream in live.
 */
export default function TopEventsCard() {
  const { price, margin } = EXAMPLE_BRAND;
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_24px_60px_rgb(28_25_23/0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-bold">Most popular events right now</p>
        <p className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
          Example brand: ${price} sale · {Math.round(margin * 100)}% margin
        </p>
      </div>
      <Suspense fallback={<Loading />}>
        <LiveRows />
      </Suspense>
    </div>
  );
}
