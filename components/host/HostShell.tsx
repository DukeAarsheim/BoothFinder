"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import BackButton from "@/components/ui/BackButton";
import HostSidebar from "./HostSidebar";

/**
 * Frame for the organizer dashboard: collapsible sidebar + a full-height,
 * scrolling content area. Rendered once in app/host/dashboard/layout.tsx.
 *
 * A copy of components/vendor/VendorShell.tsx with the same classes, so both
 * dashboards look alike without this card editing vendor files.
 */
export default function HostShell({
  children,
  className = "",
}: {
  children: ReactNode;
  /** Extra classes for the root, e.g. the font class. */
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      data-host-shell
      // The site's root theme is dark; the dashboard is a light surface.
      className={`flex h-dvh w-full overflow-hidden bg-white text-neutral-900 [color-scheme:light] ${className}`}
    >
      {/* Desktop: in-flow rail that animates between full and icon width */}
      <aside
        className={`hidden shrink-0 transition-[width] duration-200 ease-out md:block ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <HostSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>

      {/* Mobile: slide-in drawer */}
      <div
        className={`fixed inset-0 z-[1100] md:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        inert={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-neutral-950/40 transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 shadow-xl transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <HostSidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-neutral-200 px-3 md:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="grid size-10 place-items-center rounded-full text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <BackButton fallback="/start" iconOnly className="px-2.5" />
          <span className="text-xl font-extrabold tracking-tight text-emerald-700">BoothFinder</span>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
