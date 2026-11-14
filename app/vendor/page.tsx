import { Suspense } from "react";
import type { Metadata } from "next";
import Notice from "@/components/ui/Notice";
import ExploreEvents from "@/components/vendor/ExploreEvents";
import { loadEvents } from "@/lib/vendor/loadEvents";

export const metadata: Metadata = { title: "Explore events" };

export default function VendorExplorePage() {
  return (
    <Suspense fallback={<p className="p-6 text-neutral-400">Loading events…</p>}>
      <Explore />
    </Suspense>
  );
}

async function Explore() {
  const { events, source, error } = await loadEvents();
  if (error) {
    return (
      <div className="p-6">
        <Notice title="Couldn't load events" tone="error">
          <p>The database returned an error: {error}</p>
        </Notice>
      </div>
    );
  }
  return <ExploreEvents events={events} isSampleData={source === "sample"} />;
}
