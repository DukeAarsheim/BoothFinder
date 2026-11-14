"use client";

import { useState } from "react";
import VendorNotice, { SampleTag } from "@/components/vendor/VendorNotice";
import type { HostMessage } from "@/lib/host/types";

/** "2026-11-14" -> "Nov 14". Fixed locale and time zone, so server and browser agree. */
const shortDate = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Messages from vendors across all of the organizer's events, newest first.
 * Opening a message shows it in full and clears its unread dot. That is kept in
 * this component only: nothing is stored, because messaging has no backend yet.
 */
export default function Inbox({
  messages,
  eventNames,
  isSample,
}: {
  messages: HostMessage[];
  /** Event id -> event name, for the line under each sender. */
  eventNames: Record<string, string>;
  isSample: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);

  const newestFirst = [...messages].sort((a, b) => b.sentOn.localeCompare(a.sentOn));
  const isUnread = (message: HostMessage) => message.unread && !readIds.includes(message.id);
  const unreadCount = messages.filter(isUnread).length;

  const toggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
    setReadIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };

  return (
    <section aria-labelledby="inbox-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <h2 id="inbox-heading" className="text-lg font-semibold tracking-tight text-neutral-950">
            Inbox
          </h2>
          {isSample && <SampleTag />}
        </div>
        {messages.length > 0 && (
          <p className="text-[13px] text-neutral-500" aria-live="polite">
            {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
          </p>
        )}
      </div>

      <div className="mt-3">
        {messages.length === 0 ? (
          <VendorNotice title="No messages yet">
            <p>Questions from vendors about your events show up here.</p>
          </VendorNotice>
        ) : (
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
            {newestFirst.map((message) => {
              const unread = isUnread(message);
              const open = openId === message.id;
              return (
                <li key={message.id}>
                  <button
                    type="button"
                    onClick={() => toggle(message.id)}
                    aria-expanded={open}
                    className="flex w-full gap-3 px-5 py-3.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    <span
                      className={`mt-[7px] size-2 shrink-0 rounded-full ${unread ? "bg-emerald-700" : "bg-transparent"}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span
                          className={`truncate text-[15px] ${
                            unread ? "font-semibold text-neutral-950" : "font-medium text-neutral-700"
                          }`}
                        >
                          {message.vendor}
                          {unread && <span className="sr-only"> (unread)</span>}
                        </span>
                        <span className="shrink-0 text-xs text-neutral-500">{shortDate(message.sentOn)}</span>
                      </span>
                      <span className="block truncate text-[13px] text-neutral-500">
                        {eventNames[message.eventId] ?? "Event no longer listed"}
                      </span>
                      <span className={`mt-1 block text-sm text-neutral-600 ${open ? "" : "line-clamp-2"}`}>
                        {message.body}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
