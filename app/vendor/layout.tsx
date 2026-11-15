import type { Metadata } from "next";
import type { ReactNode } from "react";
import RequireSignIn from "@/components/auth/RequireSignIn";
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
      <VendorShell className={uiFont.className}>{children}</VendorShell>
    </RequireSignIn>
  );
}
