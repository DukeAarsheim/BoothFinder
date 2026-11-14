import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/ui/Notice";
import PageContainer from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Host an event" };

// Entry point for the event-host path. Host tools are not in this weekend's
// scope (MASTER.md §2); this page exists so the role choice on the home page
// leads somewhere honest.
export default function HostPage() {
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold tracking-tight">Host an event</h1>
      <p className="mt-2 text-neutral-300">
        Find vendors and manage opportunities for your events.
      </p>
      <div className="mt-8">
        <Notice title="Host tools aren't available yet" label="Not built yet">
          <p>
            Here organizers will list an event, set booth details, and reach food and
            drink brands that fit. For now, BoothFinder is built for vendors.
          </p>
          <p>
            <Link href="/vendor" className="font-medium text-emerald-400 hover:text-emerald-300">
              Explore events as a vendor
            </Link>
          </p>
        </Notice>
      </div>
    </PageContainer>
  );
}
