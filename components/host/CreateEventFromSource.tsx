"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  FileText,
  Link2,
  LoaderCircle,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { ExtractedEvent, ExtractedField, ExtractResponse } from "@/lib/extractor/types";
import { EVENT_TYPES } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/vendor/format";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const primaryButton = `inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
const quietButton = `inline-flex h-11 items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-5 text-[15px] font-semibold text-neutral-950 transition-colors hover:border-neutral-950 ${focusRing}`;
const inputBase =
  "mt-1.5 h-11 w-full rounded-xl border px-3.5 text-[15px] text-neutral-950 placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 focus:outline-none";

type FieldSpec = {
  key: ExtractedField;
  label: string;
  kind: "text" | "date" | "number" | "money" | "percent" | "type" | "url";
  wide?: boolean;
};

const GROUPS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: "The event",
    fields: [
      { key: "name", label: "Event name", kind: "text", wide: true },
      { key: "event_type", label: "Type of event", kind: "type" },
      { key: "expected_attendance", label: "Expected attendance", kind: "number" },
      { key: "start_date", label: "Starts", kind: "date" },
      { key: "end_date", label: "Ends", kind: "date" },
      { key: "venue", label: "Venue", kind: "text" },
      { key: "city", label: "City", kind: "text" },
    ],
  },
  {
    title: "For vendors",
    fields: [
      { key: "application_deadline", label: "Application deadline", kind: "date" },
      { key: "vendor_spots", label: "Vendor spots", kind: "number" },
      { key: "booth_fee_min", label: "Booth fee from", kind: "money" },
      { key: "booth_fee_max", label: "Booth fee up to", kind: "money" },
      { key: "booth_size", label: "Booth size", kind: "text" },
      { key: "electricity_fee", label: "Electricity fee", kind: "money" },
      { key: "fee_pct_of_sales", label: "Share of sales you take", kind: "percent" },
      { key: "apply_url", label: "Where vendors apply", kind: "url", wide: true },
    ],
  },
];
const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);

type Source = { kind: "file"; file: File } | { kind: "url"; url: string };
type Draft = Record<ExtractedField, string>;

const toDraft = (fields: ExtractedEvent) =>
  Object.fromEntries(ALL_FIELDS.map((f) => [f.key, fields[f.key] == null ? "" : String(fields[f.key])])) as Draft;

/**
 * Organizer's "create event" screen. Step 1: give us the vendor packet PDF or
 * the event's web page. Step 2: check the details the AI found, fix or fill
 * in anything, publish. Fields the source didn't mention stay blank and are
 * flagged; nothing is guessed.
 */
export default function CreateEventFromSource() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "review" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [found, setFound] = useState<Set<ExtractedField>>(new Set());
  const [evidence, setEvidence] = useState<ExtractResponse["evidence"]>({});

  async function read(next: Source) {
    setSource(next);
    setError(null);
    setStatus("reading");
    try {
      const body = new FormData();
      if (next.kind === "file") body.set("file", next.file);
      else body.set("url", next.url);
      const res = await fetch("/api/extract", { method: "POST", body });
      if (!res.ok) {
        const message = await res.json().then((j) => j?.error as string | undefined, () => undefined);
        throw new Error(message ?? "We couldn't read that. Try again, or try the other option.");
      }
      const data = (await res.json()) as ExtractResponse;
      setDraft(toDraft(data.fields));
      setFound(new Set(ALL_FIELDS.filter((f) => data.fields[f.key] != null).map((f) => f.key)));
      setEvidence(data.evidence ?? {});
      setStatus("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf") return setError("That file isn't a PDF.");
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

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    setStatus("saving");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: draft, sourceUrl: source?.kind === "url" ? source.url : null }),
      });
      if (!res.ok) throw new Error("We couldn't publish the listing. Your details are still here.");
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("review");
    }
  }

  function startOver() {
    setSource(null);
    setDraft(null);
    setUrl("");
    setError(null);
    setStatus("idle");
  }

  const reading = status === "reading";
  const sourceName = source?.kind === "file" ? source.file.name : source?.url;
  const foundCount = ALL_FIELDS.filter((f) => found.has(f.key)).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Create an event</h1>
        <p className="mt-1 max-w-2xl text-neutral-600">
          Give us your vendor packet or your event page. Our AI reads it and drafts the listing, and
          you check it before vendors see it.
        </p>
      </header>

      {status === "saved" ? (
        <div className="mt-8 max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-6">
          <p className="flex items-center gap-2 text-lg font-semibold text-emerald-900">
            <CircleCheck className="size-5" aria-hidden />
            {draft?.name || "Your event"} is listed
          </p>
          <p className="mt-1 text-[15px] text-emerald-900">
            Vendors can now find it and see whether it fits their brand.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/host/dashboard" className={primaryButton}>
              Back to dashboard
            </Link>
            <button type="button" onClick={startOver} className={quietButton}>
              Create another
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* ── Step 1: the source ─────────────────────────────────────────── */}
          <section aria-labelledby="source-heading" className="space-y-4">
            <h2 id="source-heading" className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">
              1 · Your packet or page
            </h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors ${
                dragging ? "border-emerald-700 bg-emerald-50" : "border-neutral-300 bg-neutral-50"
              }`}
            >
              <Upload className="mx-auto size-7 text-emerald-700" strokeWidth={1.75} aria-hidden />
              <p className="mt-3 text-base font-semibold text-neutral-950">Drop your vendor packet here</p>
              <p className="mt-1 text-sm text-neutral-600">PDF application, fee sheet, or flyer</p>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf"
                className="sr-only"
                aria-label="Choose a PDF"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={reading}
                onClick={() => fileInput.current?.click()}
                className={`mt-4 ${quietButton}`}
              >
                Choose a PDF
              </button>
            </div>

            <form onSubmit={onUrlSubmit}>
              <label htmlFor="source-url" className="text-sm font-medium text-neutral-800">
                Or paste your event page
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-1 basis-56">
                  <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                  <input
                    id="source-url"
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://"
                    className={`${inputBase} mt-0 border-neutral-300 bg-white pl-10`}
                  />
                </div>
                <button type="submit" disabled={reading} className={primaryButton}>
                  Read it
                </button>
              </div>
            </form>

            {source && (
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3">
                {source.kind === "file" ? (
                  <FileText className="size-5 shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
                ) : (
                  <Link2 className="size-5 shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
                )}
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-950">{sourceName}</p>
                {reading ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-600" role="status">
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    Reading…
                  </span>
                ) : (
                  <button type="button" onClick={startOver} aria-label="Remove and start over" className={`grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 ${focusRing}`}>
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
              We only use facts from your own packet or page, and vendors are always sent back to you
              to apply.
            </p>
          </section>

          {/* ── Step 2: review ─────────────────────────────────────────────── */}
          <section aria-labelledby="review-heading">
            <h2 id="review-heading" className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">
              2 · Check the listing
            </h2>

            {!draft ? (
              <div className="mt-4 rounded-xl border border-neutral-200 px-6 py-12 text-center">
                <Sparkles className="mx-auto size-6 text-neutral-400" strokeWidth={1.75} aria-hidden />
                <p className="mt-3 font-medium text-neutral-950">
                  {reading ? "Reading your document…" : "Your listing will appear here"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-600">
                  Dates, booth fees, the application deadline and more, ready for you to check and edit.
                </p>
              </div>
            ) : (
              <form onSubmit={publish} className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-neutral-200 px-5 py-3.5">
                  <p className="text-[15px] font-semibold text-neutral-950">
                    {foundCount} of {ALL_FIELDS.length} details found
                  </p>
                  <p className="text-[13px] text-neutral-500">Blank ones weren&apos;t in your source. We never guess.</p>
                </div>

                <div className="space-y-7 px-5 py-5">
                  {GROUPS.map((group) => (
                    <fieldset key={group.title}>
                      <legend className="text-sm font-semibold text-neutral-950">{group.title}</legend>
                      <div className="mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2">
                        {group.fields.map((field) => (
                          <Field
                            key={field.key}
                            spec={field}
                            value={draft[field.key]}
                            missing={!found.has(field.key) && draft[field.key] === ""}
                            quote={evidence?.[field.key]}
                            onChange={(value) => setDraft({ ...draft, [field.key]: value })}
                          />
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
                  <button type="button" onClick={startOver} className={quietButton}>
                    Start over
                  </button>
                  <button type="submit" disabled={status === "saving"} className={primaryButton}>
                    {status === "saving" && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                    Publish listing
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Field({
  spec,
  value,
  missing,
  quote,
  onChange,
}: {
  spec: FieldSpec;
  value: string;
  missing: boolean;
  quote?: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${spec.key}`;
  const tone = missing ? "border-dashed border-amber-600 bg-amber-50" : "border-neutral-300 bg-white";
  const numeric = spec.kind === "number" || spec.kind === "money" || spec.kind === "percent";
  const prefix = spec.kind === "money" ? "$" : null;
  const suffix = spec.kind === "percent" ? "%" : null;

  return (
    <div className={spec.wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="flex flex-wrap items-baseline justify-between gap-x-2 text-[13px] font-medium text-neutral-700">
        {spec.label}
        {missing && <span className="font-semibold text-amber-800">Not in your source</span>}
      </label>
      {spec.kind === "type" ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputBase} ${tone}`}>
          <option value="">Choose…</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          {prefix && <span className="pointer-events-none absolute top-1/2 left-3.5 mt-[3px] -translate-y-1/2 text-[15px] text-neutral-500">{prefix}</span>}
          <input
            id={id}
            type={spec.kind === "date" ? "date" : spec.kind === "url" ? "url" : "text"}
            inputMode={numeric ? "decimal" : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={missing ? "Add it if you know it" : undefined}
            className={`${inputBase} ${tone} ${prefix ? "pl-7" : ""} ${suffix ? "pr-9" : ""}`}
          />
          {suffix && <span className="pointer-events-none absolute top-1/2 right-3.5 mt-[3px] -translate-y-1/2 text-[15px] text-neutral-500">{suffix}</span>}
        </div>
      )}
      {quote && (
        <p className="mt-1.5 text-[12px] leading-snug text-neutral-500">
          From your source: &ldquo;{quote}&rdquo;
        </p>
      )}
    </div>
  );
}
