"use client";

import { useRef, useState, type FormEvent } from "react";
import { Download, Mail } from "lucide-react";
import { applicantsCsv, csvFileName } from "@/lib/host/exportCsv";
import { pipelineCounts } from "@/lib/host/metrics";
import type { HostEvent } from "@/lib/host/types";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

const outlineButton = `inline-flex h-10 items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-950 transition-colors hover:border-neutral-950 ${focusRing}`;

/**
 * The two actions for the selected event.
 *
 * - "Export applicants" downloads a real CSV built from the applicant list.
 * - "Message accepted vendors" opens a compose box. Messaging has no backend
 *   yet, so sending only confirms that nothing was sent.
 *
 * The parent gives this a `key` per event, so the draft and the status line
 * reset when the organizer picks a different event.
 */
export default function EventActions({ hostEvent }: { hostEvent: HostEvent }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const { event, applicants } = hostEvent;
  const accepted = pipelineCounts(applicants).accepted;
  const vendors = accepted === 1 ? "1 accepted vendor" : `${accepted} accepted vendors`;

  const openMessage = () => {
    if (accepted === 0) {
      setStatus("No accepted vendors to message yet.");
      return;
    }
    setError("");
    dialogRef.current?.showModal();
  };

  const send = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!draft.trim()) {
      setError("Write a message first.");
      return;
    }
    dialogRef.current?.close();
    setDraft("");
    setStatus(
      event.is_sample
        ? `Sample account: your message to ${vendors} was not sent.`
        : `Messaging isn't connected yet, so your message to ${vendors} was not sent.`,
    );
  };

  const exportApplicants = () => {
    if (applicants.length === 0) {
      setStatus("No applicants to export yet.");
      return;
    }
    // The leading byte-order mark makes Excel read accented names correctly.
    const blob = new Blob(["﻿", applicantsCsv(hostEvent)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = csvFileName(event.name);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(
      `Downloaded ${applicants.length === 1 ? "1 applicant" : `${applicants.length} applicants`}.`,
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <button type="button" onClick={openMessage} className={outlineButton}>
        <Mail className="size-4" strokeWidth={1.75} aria-hidden />
        Message accepted vendors
      </button>
      <button type="button" onClick={exportApplicants} className={outlineButton}>
        <Download className="size-4" strokeWidth={1.75} aria-hidden />
        Export applicants
      </button>
      <p role="status" className="text-[13px] text-neutral-600">
        {status}
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby="message-vendors-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-[0_8px_30px_rgb(0_0_0/0.12)] backdrop:bg-neutral-950/40"
      >
        <form onSubmit={send} className="p-6 sm:p-7" noValidate>
          <h3 id="message-vendors-title" className="text-xl font-semibold tracking-tight text-neutral-950">
            Message {vendors}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">{event.name}</p>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-neutral-950">Message</span>
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError("");
              }}
              rows={5}
              placeholder="Load-in opens at 2 PM. Enter from 12th Street and check in at the info tent."
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "message-vendors-error" : undefined}
              className={`mt-2 block w-full rounded-lg border bg-white px-3 py-2.5 text-neutral-950 transition-colors placeholder:text-neutral-500 hover:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-700 ${
                error ? "border-red-600" : "border-neutral-300"
              }`}
            />
          </label>
          {error && (
            <p id="message-vendors-error" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {event.is_sample && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              <span className="font-semibold">Sample account.</span> Nothing is sent when you press Send.
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className={outlineButton}>
              Cancel
            </button>
            <button
              type="submit"
              className={`inline-flex h-10 items-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 ${focusRing}`}
            >
              Send message
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
