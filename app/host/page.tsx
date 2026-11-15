import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, FilePlus } from "lucide-react";
import OrganizerChat from "@/components/organizers/OrganizerChat";
import { uiFont } from "@/lib/vendor/font";

export const metadata: Metadata = { title: "Host an event" };

// The organizer AI assistant. It has no event to work from until the host sets
// one up, so the side panel says so and points to Create Event; the assistant
// asks for the details it needs (lib/organizers/assistantPrompt.ts).
// Light surface to match /start and /vendor (the root theme is dark).
export default function HostPage() {
  return (
    <main
      className={`flex-1 bg-white text-neutral-900 [color-scheme:light] ${uiFont.className}`}
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-14">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CalendarPlus className="size-4" strokeWidth={2} aria-hidden />
          For event hosts
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
          Plan your event, fill your booths
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-600">
          Work through your festival&apos;s logistics with an AI assistant and find food and
          drink vendors that fit.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
          <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Your event</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">
              No event set up yet
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Once you create an event, its details will show here. Until then, tell the
              assistant about your event in your question.
            </p>
            <Link
              href="/host/dashboard/create"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-950 transition-colors hover:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <FilePlus className="size-4" aria-hidden />
              Create an event
            </Link>
          </aside>

          <OrganizerChat />
        </div>
      </div>
    </main>
  );
}
