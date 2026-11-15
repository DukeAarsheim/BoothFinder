import type { Metadata } from "next";
import ExtractEvent from "@/components/vendor/ExtractEvent";

export const metadata: Metadata = { title: "Extract an event" };

// Vendor-side extractor: paste a vendor call (PDF, link or text), the AI (Groq,
// via /api/extract) pulls out the facts, and the projection engine shows what
// the event could earn. Nothing is saved; organizers publish listings from
// their own Add event page (/host/dashboard/create).
export default function ExtractEventPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">Extract an event</h1>
      <p className="mt-1 max-w-2xl text-neutral-600">
        Found a vendor call somewhere else? Give it to our AI. It pulls out the fee, the deadline
        and the crowd size, and shows what the event could earn you.
      </p>
      <div className="mt-8">
        <ExtractEvent />
      </div>
    </div>
  );
}
