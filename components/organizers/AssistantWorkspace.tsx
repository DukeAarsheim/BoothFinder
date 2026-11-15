"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FilePlus } from "lucide-react";
import type { AssistantEvent } from "@/lib/organizers/eventFacts";
import OrganizerChat from "./OrganizerChat";

const NEW_EVENT = "__new";
const CREATE_EVENT_HREF = "/host/dashboard/create";

/**
 * The assistant page's two columns: on the left, pick which event the question
 * is about (or none, or add a new one) and see that listing's details; on the
 * right, the chat. Picking a different event starts a fresh conversation, so
 * answers about one event never mix into another.
 */
export default function AssistantWorkspace({
  events,
  error,
}: {
  events: AssistantEvent[];
  /** Set when the listings couldn't be loaded; the assistant still works for general questions. */
  error?: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const selected = events.find((e) => e.id === selectedId) ?? null;

  function onPick(value: string) {
    if (value === NEW_EVENT) router.push(CREATE_EVENT_HREF);
    else setSelectedId(value);
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[19rem_1fr]">
      <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-6">
        <label htmlFor="assistant-event" className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Which event is this about?
        </label>
        <select
          id="assistant-event"
          value={selectedId}
          onChange={(e) => onPick(e.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-[15px] font-medium text-neutral-950 focus-visible:border-neutral-950 focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          <option value="">General question (no event)</option>
          {events.length > 0 && (
            <optgroup label="Events">
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </optgroup>
          )}
          <option value={NEW_EVENT}>+ Add a new event…</option>
        </select>

        {selected ? (
          <>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-neutral-950">{selected.name}</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {selected.facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-neutral-500">{label}</dt>
                  <dd className={value ? "font-medium text-neutral-900" : "text-neutral-500"}>
                    {value ?? "Not listed"}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 border-t border-neutral-200 pt-4 text-xs leading-relaxed text-neutral-500">
              The assistant uses these details from the listing. It will ask you for anything not listed.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            {error ??
              (events.length === 0
                ? "No events are listed yet. Ask a general question, or add your event first."
                : "Pick an event and the assistant will use its listing. Or ask a general question.")}
          </p>
        )}

        <Link
          href={CREATE_EVENT_HREF}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-950 transition-colors hover:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <FilePlus className="size-4" aria-hidden />
          Add a new event
        </Link>
      </aside>

      {/* The key restarts the conversation whenever a different event is picked. */}
      <OrganizerChat key={selectedId} event={selected ? { id: selected.id, name: selected.name } : null} />
    </div>
  );
}
