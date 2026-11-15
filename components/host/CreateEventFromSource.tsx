"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  FileText,
  Link2,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";
import type { ExtractedEvent, ExtractedField, ExtractResponse } from "@/lib/extractor/types";
import type { ExtraField } from "@/lib/host/eventExtras";
import { EVENT_TYPES } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/vendor/format";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const primaryButton = `inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
const quietButton = `inline-flex h-11 items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-5 text-[15px] font-semibold text-neutral-950 transition-colors hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
/** The two small "fill it in from…" buttons beside the page title. */
const smallButton = `inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
const inputBase =
  "mt-1.5 w-full rounded-xl border px-3.5 text-[15px] text-neutral-950 placeholder:text-neutral-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 focus:outline-none";

type FieldKey = ExtractedField | ExtraField;

type FieldSpec = {
  key: FieldKey;
  label: string;
  kind: "text" | "longtext" | "date" | "number" | "money" | "percent" | "type" | "url";
  wide?: boolean;
  /** Example shown in the empty field. */
  example?: string;
  /**
   * true = the organizer types this one in; the AI doesn't read it from a file
   * (lib/host/eventExtras.ts). Everything else is in lib/extractor/types.ts.
   */
  byHand?: boolean;
};

const GROUPS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: "The event",
    fields: [
      { key: "name", label: "Event name", kind: "text", wide: true },
      { key: "event_type", label: "Type of event", kind: "type" },
      { key: "start_date", label: "Starts", kind: "date" },
      { key: "end_date", label: "Ends", kind: "date" },
      { key: "venue", label: "Venue", kind: "text" },
      { key: "city", label: "City", kind: "text" },
      { key: "county", label: "County", kind: "text", example: "San Luis Obispo", byHand: true },
      { key: "expected_attendance", label: "Expected attendance", kind: "number" },
      {
        key: "attendance_source",
        label: "Where that attendance number comes from",
        kind: "text",
        example: "2025 gate count",
        byHand: true,
      },
    ],
  },
  {
    title: "For vendors",
    fields: [
      { key: "application_deadline", label: "Application deadline", kind: "date" },
      { key: "vendor_spots", label: "Vendor spots", kind: "number" },
      { key: "booth_size", label: "Booth size", kind: "text", example: "10x10" },
      { key: "booth_fee_min", label: "Booth fee from", kind: "money" },
      { key: "booth_fee_max", label: "Booth fee up to", kind: "money" },
      { key: "application_fee", label: "Application fee", kind: "money", byHand: true },
      { key: "electricity_fee", label: "Electricity fee", kind: "money" },
      { key: "fee_pct_of_sales", label: "Share of sales you take", kind: "percent" },
      {
        key: "similar_vendor_limit",
        label: "Limit on similar vendors",
        kind: "text",
        example: "4 drink vendors",
        byHand: true,
      },
      { key: "apply_url", label: "Where vendors apply", kind: "url", wide: true, example: "https://" },
      {
        key: "notes",
        label: "Anything else vendors should know",
        kind: "longtext",
        wide: true,
        byHand: true,
      },
    ],
  },
];
const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);
/** The fields the AI reads from a file or link. */
const READ_FIELDS = ALL_FIELDS.filter((f) => !f.byHand);

type Source = { kind: "file"; file: File } | { kind: "url"; url: string };

/** PDFs plus plain-text files; the server reads both. */
const ACCEPT = "application/pdf,.pdf,text/plain,.txt,.md,.csv,.html,.htm";
const isReadable = (f: File) => /\.(pdf|txt|md|csv|html?)$/i.test(f.name) || f.type === "application/pdf" || f.type.startsWith("text/");

type Draft = Record<FieldKey, string>;
const EMPTY_DRAFT = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, ""])) as Draft;

/**
 * Organizer's "add event" screen. The form fills the page and starts empty, so
 * an organizer can type a listing in by hand. Two small buttons beside the
 * title open an area to give us a vendor packet (PDF or text file) or a link
 * instead: the AI fills in the details it finds, and the organizer checks
 * them. Fields the source didn't mention stay blank and are flagged; nothing is
 * guessed.
 */
export default function CreateEventFromSource() {
  const fileInput = useRef<HTMLInputElement>(null);
  /** Which "fill it in from…" area is open. Both are closed until asked for. */
  const [open, setOpen] = useState<"file" | "link" | null>(null);
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "saving" | "saved">("idle");
  /** A problem reading the file or link. Shown under the open area. */
  const [readError, setReadError] = useState<string | null>(null);
  /** A problem with the form or with publishing. Shown beside the Publish button. */
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  /** Which details the AI found. null = nothing has been read yet. */
  const [found, setFound] = useState<Set<FieldKey> | null>(null);
  const [evidence, setEvidence] = useState<ExtractResponse["evidence"]>({});

  async function read(next: Source) {
    setSource(next);
    setReadError(null);
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
      const fields: ExtractedEvent = data.fields;
      const foundKeys = READ_FIELDS.filter((f) => fields[f.key as ExtractedField] != null).map((f) => f.key);
      // Fill in what the AI found. Anything it didn't find keeps what the
      // organizer already typed, so reading a file never wipes their work.
      setDraft((current) => ({
        ...current,
        ...Object.fromEntries(foundKeys.map((key) => [key, String(fields[key as ExtractedField])])),
      }));
      setFound(new Set(foundKeys));
      setEvidence(data.evidence ?? {});
      setOpen(null); // done: get out of the way of the form
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "Something went wrong.");
      setSource(null);
    } finally {
      setStatus("idle");
    }
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!isReadable(file)) {
      return setReadError("We can read PDFs and text files. For a Word doc or an image, use a link instead.");
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

  function toggle(area: "file" | "link") {
    setReadError(null);
    setOpen((current) => (current === area ? null : area));
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setFormError("Add the event's name before publishing.");
      return;
    }
    setFormError(null);
    setStatus("saving");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: draft,
          sourceUrl: source?.kind === "url" ? source.url : null,
          createdVia: found ? "extractor" : "manual",
        }),
      });
      if (!res.ok) {
        const message = await res.json().then((j) => j?.error as string | undefined, () => undefined);
        throw new Error(message ?? "We couldn't publish the listing. Your details are still here.");
      }
      setStatus("saved");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  function clearForm() {
    setSource(null);
    setDraft(EMPTY_DRAFT);
    setFound(null);
    setEvidence({});
    setUrl("");
    setOpen(null);
    setReadError(null);
    setFormError(null);
    setStatus("idle");
  }

  const reading = status === "reading";
  const saved = status === "saved";
  const sourceName = source?.kind === "file" ? source.file.name : source?.url;
  const foundCount = found ? READ_FIELDS.filter((f) => found.has(f.key)).length : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Add an event</h1>
          <p className="mt-1 max-w-2xl text-neutral-600">
            Type in the details, or let our AI fill them in from your vendor packet or event page.
            Either way, you check the listing before vendors see it.
          </p>
        </div>

        {!saved && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Fill the form in from a file or link">
            <button
              type="button"
              onClick={() => toggle("file")}
              aria-expanded={open === "file"}
              aria-controls="source-area"
              disabled={reading}
              className={`${smallButton} ${
                open === "file"
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-300 bg-white text-neutral-950 hover:border-neutral-950"
              }`}
            >
              <Upload className="size-4" strokeWidth={1.75} aria-hidden />
              Upload a file
            </button>
            <button
              type="button"
              onClick={() => toggle("link")}
              aria-expanded={open === "link"}
              aria-controls="source-area"
              disabled={reading}
              className={`${smallButton} ${
                open === "link"
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-300 bg-white text-neutral-950 hover:border-neutral-950"
              }`}
            >
              <Link2 className="size-4" strokeWidth={1.75} aria-hidden />
              Use a link
            </button>
          </div>
        )}
      </header>

      {saved ? (
        <div className="mt-8 max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-6">
          <p className="flex items-center gap-2 text-lg font-semibold text-emerald-900">
            <CircleCheck className="size-5" aria-hidden />
            {draft.name.trim() || "Your event"} is listed
          </p>
          <p className="mt-1 text-[15px] text-emerald-900">
            Vendors can now find it and see whether it fits their brand.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/host/dashboard" className={primaryButton}>
              Back to dashboard
            </Link>
            <button type="button" onClick={clearForm} className={quietButton}>
              Add another
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Opened by the two buttons above: a file, or a link ──────────── */}
          <div id="source-area" className="space-y-3 empty:hidden [&:not(:empty)]:mt-6">
            {open === "file" && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border-2 border-dashed px-6 py-5 transition-colors ${
                  dragging ? "border-emerald-700 bg-emerald-50" : "border-neutral-300 bg-neutral-50"
                }`}
              >
                <div>
                  <p className="text-[15px] font-semibold text-neutral-950">Drop your vendor packet here</p>
                  <p className="mt-0.5 text-sm text-neutral-600">
                    PDF or text file: application, fee sheet, flyer. We fill in what it says and
                    leave the rest blank.
                  </p>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  aria-label="Choose a file"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={reading}
                  onClick={() => fileInput.current?.click()}
                  className={quietButton}
                >
                  Choose a file
                </button>
              </div>
            )}

            {open === "link" && (
              <form onSubmit={onUrlSubmit} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-5">
                <label htmlFor="source-url" className="text-[15px] font-semibold text-neutral-950">
                  Link to your event page or PDF
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="relative min-w-0 flex-1 basis-64">
                    <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                    <input
                      id="source-url"
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://"
                      className={`${inputBase} mt-0 h-11 border-neutral-300 bg-white pl-10`}
                    />
                  </div>
                  <button type="submit" disabled={reading} className={quietButton}>
                    Read it
                  </button>
                </div>
              </form>
            )}

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
                  <button type="button" onClick={clearForm} aria-label="Remove the source and clear the form" className={`grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 ${focusRing}`}>
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            )}

            {readError && (
              <p role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {readError}
              </p>
            )}
          </div>

          {/* ── The listing: fills the page, always open, starts empty ──────── */}
          <form onSubmit={publish} noValidate className="mt-6 overflow-hidden rounded-xl border border-neutral-200">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-neutral-200 px-5 py-3.5">
              {found ? (
                <>
                  <p className="text-[15px] font-semibold text-neutral-950" role="status">
                    {foundCount} of {READ_FIELDS.length} details found
                  </p>
                  <p className="text-[13px] text-neutral-500">Blank ones weren&apos;t in your source. We never guess.</p>
                </>
              ) : (
                <>
                  <h2 className="text-[15px] font-semibold text-neutral-950">
                    {reading ? "Reading your document…" : "Event details"}
                  </h2>
                  <p className="text-[13px] text-neutral-500">Only the name is required. Leave the rest blank if you&apos;re not sure.</p>
                </>
              )}
            </div>

            <div className="space-y-8 px-5 py-6">
              {GROUPS.map((group) => (
                <fieldset key={group.title}>
                  <legend className="text-sm font-semibold text-neutral-950">{group.title}</legend>
                  <div className="mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.fields.map((field) => (
                      <Field
                        key={field.key}
                        spec={field}
                        value={draft[field.key]}
                        // Only flag a blank once a source has been read, and only
                        // for details the AI looks for.
                        missing={Boolean(found) && !field.byHand && !found?.has(field.key) && draft[field.key] === ""}
                        quote={evidence?.[field.key as ExtractedField]}
                        onChange={(value) => {
                          setDraft((current) => ({ ...current, [field.key]: value }));
                          if (field.key === "name") setFormError(null);
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4">
              {formError && (
                <p role="alert" className="mb-3 flex items-start gap-2.5 text-sm leading-relaxed text-red-800">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {formError}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={clearForm} className={quietButton}>
                  Clear form
                </button>
                <button type="submit" disabled={status === "saving" || reading} className={primaryButton}>
                  {status === "saving" && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                  Publish listing
                </button>
              </div>
            </div>
          </form>

          <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
            We only use facts from what you give us, and vendors are always sent back to you to apply.
          </p>
        </>
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
  const placeholder = missing ? "Add it if you know it" : spec.example ? `For example: ${spec.example}` : undefined;

  return (
    <div className={spec.wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <label htmlFor={id} className="flex flex-wrap items-baseline justify-between gap-x-2 text-[13px] font-medium text-neutral-700">
        {spec.label}
        {missing && <span className="font-semibold text-amber-800">Not in your source</span>}
      </label>
      {spec.kind === "type" ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputBase} h-11 ${tone}`}>
          <option value="">Choose…</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      ) : spec.kind === "longtext" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className={`${inputBase} resize-y py-3 ${tone}`}
        />
      ) : (
        <div className="relative">
          {prefix && <span className="pointer-events-none absolute top-1/2 left-3.5 mt-[3px] -translate-y-1/2 text-[15px] text-neutral-500">{prefix}</span>}
          <input
            id={id}
            type={spec.kind === "date" ? "date" : spec.kind === "url" ? "url" : "text"}
            inputMode={numeric ? "decimal" : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${inputBase} h-11 ${tone} ${prefix ? "pl-7" : ""} ${suffix ? "pr-9" : ""}`}
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
