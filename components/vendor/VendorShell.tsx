"use client";

import { useState, type ReactNode } from "react";
import { Menu, Tent } from "lucide-react";
import VendorSidebar from "./VendorSidebar";

/**
 * Frame for every /vendor page: collapsible sidebar + a full-height content
 * area. Rendered once in app/vendor/layout.tsx. Pages decide their own inner
 * layout (the Explore page fills it; others use <VendorPage>).
 */
export default function VendorShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div data-vendor-shell className="flex h-dvh w-full overflow-hidden bg-neutral-950">
      {/* Desktop: in-flow rail that animates between full and icon width */}
      <aside
        className={`hidden shrink-0 transition-[width] duration-200 ease-out md:block ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <VendorSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
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
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 transition-transform duration-200 ease-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <VendorSidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-neutral-800 px-3 md:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="grid size-10 place-items-center rounded-lg text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Tent className="size-5 text-emerald-400" aria-hidden />
          <span className="text-lg font-bold tracking-tight">BoothFinder</span>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
