import type { Metadata } from "next";
import Notice from "@/components/ui/Notice";
import PageContainer from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Extract" };

// Placeholder. The extractor is two Kanban cards (MASTER.md §7):
// the /api/extract route and this screen.
export default function ExtractPage() {
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold tracking-tight">Extract an event</h1>
      <p className="mt-2 text-neutral-300">
        Turn an event&apos;s web page or vendor PDF into a listing.
      </p>
      <div className="mt-8">
        <Notice title="Nothing on this page works yet" label="Not built yet">
          <p>
            Here you&apos;ll paste an event URL or upload a vendor PDF. The AI will
            pull out the event&apos;s details, such as dates, booth fees, and the
            application deadline, for you to check, correct, and save.
          </p>
        </Notice>
      </div>
    </PageContainer>
  );
}
