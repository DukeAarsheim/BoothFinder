import { Suspense } from "react";
import type { Metadata } from "next";
import VendorNotice from "@/components/vendor/VendorNotice";
import BrandProfileForm from "@/components/vendor/BrandProfileForm";
import VendorPage from "@/components/vendor/VendorPage";
import EventProjections from "@/components/fit/EventProjections";
import { loadEvents } from "@/lib/vendor/loadEvents";

export const metadata: Metadata = { title: "Fit calculator" };

// The brand's inputs (saved in this browser) and every event's projected profit.
// The math is lib/scoring/projection.ts (projection engine v1; MASTER.md §4).
export default function FitCalculatorPage() {
  return (
    <VendorPage
      title="Fit Calculator"
      intro="Enter your numbers once. Every event's projected profit updates as soon as you save."
    >
      <div className="space-y-10">
        <BrandProfileForm />
        <Suspense fallback={<p className="text-neutral-500">Loading events…</p>}>
          <Projections />
        </Suspense>
      </div>
    </VendorPage>
  );
}

async function Projections() {
  const { events, source, error } = await loadEvents();
  if (error) {
    return (
      <VendorNotice title="Couldn't load events" tone="error">
        <p>The database returned an error: {error}</p>
      </VendorNotice>
    );
  }
  return <EventProjections events={events} isSampleData={source === "sample"} />;
}
