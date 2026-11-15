import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import AssistantWorkspace from "@/components/organizers/AssistantWorkspace";
import { loadHostEvents } from "@/lib/host/loadEvents";
import { toAssistantEvent } from "@/lib/organizers/eventFacts";
import BackButton from "@/components/ui/BackButton";
import { uiFont } from "@/lib/vendor/font";

export const metadata: Metadata = { title: "Host an event" };

// The organizer AI assistant. The host picks which event a question is about
// (or none, or adds a new one); the assistant then works from that listing
// (lib/organizers/assistantPrompt.ts).
// Light surface to match /start and /vendor (the root theme is dark).
export default function HostPage() {
  return (
    <main
      className={`flex-1 bg-white text-neutral-900 [color-scheme:light] ${uiFont.className}`}
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-14">
        {/* The site header (and its Back button) can be hidden when arriving from the dashboard. */}
        <BackButton fallback="/host/dashboard" className="mb-4 -ml-2.5" />
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

        {/* Listings are read live, so this part streams in (README, "Loading data in pages"). */}
        <Suspense fallback={<p className="mt-8 text-neutral-500">Loading your events…</p>}>
          <Workspace />
        </Suspense>
      </div>
    </main>
  );
}

/** Same published listings as the organizer dashboard (there are no per-host accounts yet). */
async function Workspace() {
  const { events, error } = await loadHostEvents();
  return <AssistantWorkspace events={events.map(toAssistantEvent)} error={error} />;
}
