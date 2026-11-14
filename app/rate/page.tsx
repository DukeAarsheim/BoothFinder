import type { Metadata } from "next";
import Notice from "@/components/ui/Notice";
import PageContainer from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Rate" };

// Placeholder. The give-to-get rating flow is a P2 Kanban card (MASTER.md §7).
export default function RatePage() {
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold tracking-tight">Rate an event</h1>
      <p className="mt-2 text-neutral-300">
        Share how an event went for you, and see how it went for other vendors.
      </p>
      <div className="mt-8">
        <Notice title="Nothing on this page works yet" label="Not built yet">
          <p>
            Here you&apos;ll rate one event you sold at: booth cost, sales, foot
            traffic, and whether you&apos;d go back. Rating one event unlocks
            every vendor&apos;s ratings.
          </p>
        </Notice>
      </div>
    </PageContainer>
  );
}
