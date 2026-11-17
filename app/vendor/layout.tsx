import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import RequireSignIn from "@/components/auth/RequireSignIn";
import RequireVendorSetup from "@/components/vendor/RequireVendorSetup";
import VendorShell from "@/components/vendor/VendorShell";
import { uiFont } from "@/lib/vendor/font";

export const metadata: Metadata = { title: "Vendor dashboard" };

// The dashboard has its own sidebar navigation, so the site-wide header (in the
// protected root layout) is hidden on /vendor pages with one CSS rule instead of
// editing shared files.
const HIDE_SITE_HEADER = "body:has([data-vendor-shell]) > header { display: none; }";

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    // Every vendor page needs a sign-in made on the vendor side. Visitors
    // without one are sent to /signin/vendor.
    <RequireSignIn role="vendor">
      <style>{HIDE_SITE_HEADER}</style>
      <Suspense fallback={<p className="p-6 text-neutral-500">Loading vendor dashboard…</p>}>
        <VendorShell className={uiFont.className}>
          {/* A first-time vendor sets up their account before seeing any estimates. */}
          <RequireVendorSetup>{children}</RequireVendorSetup>
        </VendorShell>
      </Suspense>
    </RequireSignIn>
  );
}
