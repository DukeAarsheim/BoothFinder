import type { Metadata } from "next";
import type { ReactNode } from "react";
import VendorShell from "@/components/vendor/VendorShell";

export const metadata: Metadata = { title: "Vendor dashboard" };

// The dashboard has its own sidebar navigation, so the site-wide header (in the
// protected root layout) is hidden on /vendor pages with one CSS rule instead of
// editing shared files.
const HIDE_SITE_HEADER = "body:has([data-vendor-shell]) > header { display: none; }";

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{HIDE_SITE_HEADER}</style>
      <VendorShell>{children}</VendorShell>
    </>
  );
}
