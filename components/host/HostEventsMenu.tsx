"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

type MenuEvent = { id: string; name: string };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

/**
 * Collapsible "Events" group in the organizer sidebar: every published
 * (non-sample) event, earliest first. Each one opens the dashboard with that
 * event selected (`/host/dashboard?event=<id>`).
 *
 * The list is read in the browser with the public key, which can only read
 * listings. When the sidebar is shrunk to icons, it becomes a single icon link.
 */
export default function HostEventsMenu({
  collapsed,
  labelClass,
  onNavigate,
}: {
  collapsed: boolean;
  labelClass: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const selectedId = useSearchParams().get("event");
  // The sidebar is rendered twice (desktop rail and phone drawer), so the id must be unique per copy.
  const listId = useId();
  const [open, setOpen] = useState(true);
  const [events, setEvents] = useState<MenuEvent[] | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      queueMicrotask(() => setEvents([]));
      return;
    }
    let cancelled = false;
    supabase
      .from("events")
      .select("id, name")
      .eq("is_sample", false)
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!cancelled) setEvents(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const row = `flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-[15px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950 ${focusRing}`;

  if (collapsed) {
    return (
      <Link href="/host/dashboard" onClick={onNavigate} title="Events" className={row}>
        <CalendarDays className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className={labelClass}>Events</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        data-events-toggle
        className={row}
      >
        <CalendarDays className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-left">Events</span>
        {events && <span className="text-[13px] text-neutral-500">{events.length}</span>}
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <ul id={listId} data-events-list hidden={!open} className="mt-0.5 ml-[1.35rem] space-y-0.5 border-l border-neutral-200 pl-2">
        {events === null && <li className="px-2.5 py-2 text-[13px] text-neutral-500">Loading events…</li>}
        {events?.length === 0 && <li className="px-2.5 py-2 text-[13px] text-neutral-500">No events yet</li>}
        {events?.map((event) => {
          const active = pathname === "/host/dashboard" && selectedId === event.id;
          return (
            <li key={event.id}>
              <Link
                href={`/host/dashboard?event=${event.id}`}
                onClick={onNavigate}
                aria-current={active ? "true" : undefined}
                title={event.name}
                className={`block truncate rounded-lg px-2.5 py-2 text-sm transition-colors ${focusRing} ${
                  active
                    ? "bg-neutral-100 font-semibold text-neutral-950"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"
                }`}
              >
                {event.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
