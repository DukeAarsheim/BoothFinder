import type { Metadata } from "next";
import Link from "next/link";
import Notice from "@/components/ui/Notice";
import PageContainer from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Vendor ratings" };

export default function RatePage() {
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold tracking-tight">Vendor ratings</h1>
      <p className="mt-2 text-neutral-300">
        Share what an event was like and learn from other vendors.
      </p>
      <div className="mt-8">
        <Notice title="On the roadmap" label="Coming later">
          <p>
            Vendor reports and give-to-get ratings are planned for a future
            version. They aren&apos;t available in this demo yet.
          </p>
          <Link className="mt-4 inline-block font-semibold underline" href="/vendor">
            Explore events
          </Link>
        </Notice>
      </div>
    </PageContainer>
  );
}
