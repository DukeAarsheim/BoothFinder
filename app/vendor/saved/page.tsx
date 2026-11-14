import { Suspense } from "react";
import type { Metadata } from "next";
import Notice from "@/components/ui/Notice";
import SavedEvents from "@/components/vendor/SavedEvents";
import VendorPage from "@/components/vendor/VendorPage";
import { loadEvents } from "@/lib/vendor/loadEvents";

export const metadata: Metadata = { title: "Saved events" };

export default function SavedEventsPage() {
  return (
    <VendorPage title="Saved Events" intro="Opportunities you bookmarked while exploring.">
      <Suspense fallback={<p className="text-neutral-400">Loading saved events…</p>}>
        <Saved />
      </Suspense>
    </VendorPage>
  );
}

async function Saved() {
  const { events, error } = await loadEvents();
  if (error) {
    return (
      <Notice title="Couldn't load events" tone="error">
        <p>The database returned an error: {error}</p>
      </Notice>
    );
  }
  return <SavedEvents events={events} />;
}
