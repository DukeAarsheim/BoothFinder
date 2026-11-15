"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { CircleAlert, ExternalLink, FileText, Link2, LoaderCircle, Sparkles, Upload, X } from "lucide-react";
import EventProjections from "@/components/fit/EventProjections";
import type { ExtractedEvent, ExtractedField, ExtractResponse } from "@/lib/extractor/types";
import type { EventRow } from "@/lib/types";
import { EVENT_TYPE_LABELS, formatBoothFee, formatDate, formatDateRange } from "@/lib/vendor/format";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const primaryButton = `inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
const quietButton = `inline-flex h-11 items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-5 text-[15px] font-semibold text-neutral-950 transition-colors hover:border-neutral-950 ${focusRing}`;
const field =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 text-[15px] text-neutral-950 placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 focus:outline-none";

/** PDFs plus plain-text files; the server reads both. */
const ACCEPT = "application/pdf,.pdf,text/plain,.txt,.md,.csv,.html,.htm";
const isReadable = (f: File) =>
  /\.(pdf|txt|md|csv|html?)$/i.test(f.name) || f.type === "application/pdf" || f.type.startsWith("text/");

type Source = { kind: "file"; file: File } | { kind: "url"; url: string } | { kind: "text"; text: string };

const usd = (n: number | null) => (n == null ? null : `$${n.toLocaleString("en-US")}`);

/** The details shown to the vendor, in reading order. null = the source didn't say. */
function detailRows(e: ExtractedEvent): [ExtractedField, string, string | null][] {
  return [
    ["event_type", "Type", e.event_type ? (EVENT_TYPE_LABELS[e.event_type] ?? null) : null],
    ["start_date", "Dates", formatDateRange(e.start_date, e.end_date)],
    ["venue", "Where", [e.venue, e.city].filter(Boolean).join(", ") || null],
    ["expected_attendance", "Expected attendance", e.expected_attendance?.toLocaleString("en-US") ?? null],
    ["booth_fee_min", "Booth fee", formatBoothFee(e)],
    ["fee_pct_of_sales", "Share of sales taken", e.fee_pct_of_sales != null ? `${e.fee_pct_of_sales}%` : null],
    ["booth_size", "Booth size", e.booth_size],
    ["electricity_fee", "Electricity fee", usd(e.electricity_fee)],
    ["vendor_spots", "Vendor spots", e.vendor_spots?.toLocaleString("en-US") ?? null],
    ["application_deadline", "Apply by", formatDate(e.application_deadline)],
  ];
}

/**
 * Stand-in listing for the projection engine: the extracted details plus
 * blanks for everything a pasted source can't tell us. Never saved anywhere.
 */
function toEventRow(e: ExtractedEvent, sourceUrl: string | null): EventRow {
  return {
    id: "extracted",
    name: e.name ?? "This event",
    event_type: e.event_type ?? "other",
    start_date: e.start_date,
    end_date: e.end_date,
    venue: e.venue,
    city: e.city,
    county: null,
    application_deadline: e.application_deadline,
    booth_fee_min: e.booth_fee_min,
    booth_fee_max: e.booth_fee_max,
    booth_size: e.booth_size,
    electricity_fee: e.electricity_fee,
    fee_pct_of_sales: e.fee_pct_of_sales,
    expected_attendance: e.expected_attendance,
    vendor_spots: e.vendor_spots,
    apply_url: e.apply_url,
    source_url: sourceUrl,
    // The source is the organizer's own page or packet, so the figure is their claim.
    attendance_source: e.expected_attendance != null ? "organizer claim" : null,
    application_fee: null,
    fee_notes: null,
    fee_info_year: null,
    how_to_apply: null,
    similar_vendor_limit: null,
    day_type: null,
    notes: null,
    schedule_notes: null,
    is_sample: false,
    created_via: "extractor",
    created_at: "",
    updated_at: "",
  } as unknown as EventRow;
}

/**
 * Vendor-side extractor: give it a vendor call (PDF, link or pasted text), the
 * AI pulls out the facts, and the projection engine shows what the event could
 * earn this brand. Nothing is saved or published; it is a private check.
 */
export default function ExtractEvent() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);

  async function read(next: Source) {
    setSource(next);
    setError(null);
    setResult(null);
    setReading(true);
    try {
      const body = new FormData();
      if (next.kind === "file") body.set("file", next.file);
      else if (next.kind === "url") body.set("url", next.url);
      else body.set("text", next.text);
      const res = await fetch("/api/extract", { method: "POST", body });
      if (!res.ok) {
        const message = await res.json().then((j) => j?.error as string | undefined, () => undefined);
        throw new Error(message ?? "We couldn't read that. Try again, or try another option.");
      }
      setResult((await res.json()) as ExtractResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setReading(false);
    }
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!isReadable(file)) {
      return setError("We can read PDFs and text files. For a Word doc or an image, paste the text or a link instead.");
    }
    read({ kind: "file", file });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files[0]);
  }

  function onUrlSubmit(event: FormEvent) {
    event.preventDefault();
    if (url.trim()) read({ kind: "url", url: url.trim() });
  }

  function onTextSubmit(event: FormEvent) {
    event.preventDefault();
    if (pasted.trim()) read({ kind: "text", text: pasted.trim() });
  }

  function startOver() {
    setSource(null);
    setResult(null);
    setError(null);
    setUrl("");
    setPasted("");
  }

  const sourceName =
    source?.kind === "file" ? source.file.name : source?.kind === "url" ? source.url : "Pasted text";
  const sourceUrl = source?.kind === "url" ? source.url : null;
  const fields = result?.fields ?? null;
  const rows = fields ? detailRows(fields) : [];
  const found = rows.filter(([, , value]) => value != null).length;
  const applyLink = fields?.apply_url ?? sourceUrl;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ── Step 1: the vendor call ───────────────────────────────────────── */}
      <section aria-labelledby="extract-source" className="space-y-4">
        <h2 id="extract-source" className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">
          1 · The vendor call
        </h2>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragging ? "border-emerald-700 bg-emerald-50" : "border-neutral-300 bg-neutral-50"
          }`}
        >
          <Upload className="mx-auto size-7 text-emerald-700" strokeWidth={1.75} aria-hidden />
          <p className="mt-3 text-base font-semibold text-neutral-950">Drop a vendor application here</p>
          <p className="mt-1 text-sm text-neutral-600">PDF or text file: application, fee sheet, flyer</p>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label="Choose a file"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <button type="button" disabled={reading} onClick={() => fileInput.current?.click()} className={`mt-4 ${quietButton}`}>
            Choose a file
          </button>
        </div>

        <form onSubmit={onUrlSubmit}>
          <label htmlFor="extract-url" className="text-sm font-medium text-neutral-800">
            Or paste a link to the event page or PDF
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1 basis-56">
              <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
              <input
                id="extract-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                className={`${field} h-11 pl-10`}
              />
            </div>
            <button type="submit" disabled={reading} className={primaryButton}>
              Read it
            </button>
          </div>
        </form>

        <form onSubmit={onTextSubmit}>
          <label htmlFor="extract-text" className="text-sm font-medium text-neutral-800">
            Or paste the details
          </label>
          <p id="extract-text-hint" className="text-[13px] text-neutral-500">
            An email, a Google Form, a social post: anything that describes the event.
          </p>
          <textarea
            id="extract-text"
            aria-describedby="extract-text-hint"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder="Paste the event details here"
            className={`${field} mt-1.5 resize-y py-3`}
          />
          <button type="submit" disabled={reading || pasted.trim().length === 0} className={`mt-2 ${primaryButton}`}>
            Read the text
          </button>
        </form>

        {source && (
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3">
            {source.kind === "url" ? (
              <Link2 className="size-5 shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
            ) : (
              <FileText className="size-5 shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-950">{sourceName}</p>
            {reading ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-600" role="status">
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                Reading…
              </span>
            ) : (
              <button
                type="button"
                onClick={startOver}
                aria-label="Remove and start over"
                className={`grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 ${focusRing}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <p className="text-[13px] leading-relaxed text-neutral-500">
          This is a private check. Nothing you add here is saved or published.
        </p>
      </section>

      {/* ── Step 2: what the AI found, and what it could earn ──────────────── */}
      <section aria-labelledby="extract-result" className="min-w-0">
        <h2 id="extract-result" className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">
          2 · What we found
        </h2>

        {!fields ? (
          <div className="mt-4 rounded-xl border border-neutral-200 px-6 py-12 text-center">
            <Sparkles className="mx-auto size-6 text-neutral-400" strokeWidth={1.75} aria-hidden />
            <p className="mt-3 font-medium text-neutral-950">
              {reading ? "Reading the vendor call…" : "The event's details will appear here"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-600">
              Dates, booth fee, deadline and crowd size, then what the event could earn your brand.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
                    {fields.name ?? "Event name not found"}
                  </h3>
                  <p className="text-[13px] text-neutral-500">
                    {found} of {rows.length} details found. Blank ones weren&apos;t in the source; we never guess.
                  </p>
                </div>
                {applyLink && (
                  <a href={applyLink} target="_blank" rel="noopener noreferrer" className={quietButton}>
                    {fields.apply_url ? "Apply" : "Open source"}
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                )}
              </div>
              <dl className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
                {rows.map(([key, label, value]) => (
                  <div key={key}>
                    <dt className="text-[13px] text-neutral-500">{label}</dt>
                    <dd className={value ? "font-medium text-neutral-950" : "text-amber-800"}>
                      {value ?? "Not in the source"}
                    </dd>
                    {result?.evidence?.[key] && (
                      <p className="mt-0.5 text-[12px] leading-snug text-neutral-500">
                        &ldquo;{result.evidence[key]}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </dl>
            </div>

            <div>
              {/* Brings its own heading: "Projected profit by event". */}
              <EventProjections events={[toEventRow(fields, sourceUrl)]} isSampleData={false} />
            </div>

            <button type="button" onClick={startOver} className={quietButton}>
              Check another event
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
