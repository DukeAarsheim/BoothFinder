import type { Metadata } from "next";
import type { ReactNode } from "react";
import HostShell from "@/components/host/HostShell";
import { uiFont } from "@/lib/vendor/font";

export const metadata: Metadata = { title: "Organizer dashboard" };

// Same approach as app/vendor/layout.tsx: the dashboard has its own sidebar, so
// the site-wide header (in the protected root layout) is hidden on these pages
// with one CSS rule instead of editing shared files.
const HIDE_SITE_HEADER = "body:has([data-host-shell]) > header { display: none; }";

export default function HostDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{HIDE_SITE_HEADER}</style>
      <HostShell className={uiFont.className}>{children}</HostShell>
    </>
  );
}
