"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Menu, Tent } from "lucide-react";
import { VENDOR_NAV } from "@/lib/vendor/nav";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

/**
 * Dashboard navigation. Destinations come from VENDOR_NAV (lib/vendor/nav.ts).
 * `collapsed` shrinks it to an icon rail on desktop; on mobile it is a drawer
 * controlled by VendorShell.
 */
export default function VendorSidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const label = `overflow-hidden whitespace-nowrap transition-[opacity,width] duration-200 ${
    collapsed ? "md:w-0 md:opacity-0" : "opacity-100"
  }`;

  return (
    <div className="flex h-full flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="flex h-16 shrink-0 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          className={`grid size-10 shrink-0 place-items-center rounded-lg text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white ${focusRing}`}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <Link
          href="/"
          onClick={onNavigate}
          className={`flex items-center gap-2 rounded-md text-lg font-bold tracking-tight ${focusRing} ${label}`}
          tabIndex={collapsed ? -1 : undefined}
        >
          <Tent className="size-5 text-emerald-400" aria-hidden />
          BoothFinder
        </Link>
      </div>

      <nav aria-label="Vendor dashboard" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {VENDOR_NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : item.description}
                  className={`group relative flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors ${focusRing} ${
                    active
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "text-neutral-400 hover:bg-neutral-800/70 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-y-2 -left-3 w-1 rounded-r bg-emerald-400" aria-hidden />
                  )}
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className={label}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-neutral-800 p-3">
        <Link
          href="/"
          onClick={onNavigate}
          title="Back to the vendor / host choice"
          className={`flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-800/70 hover:text-white ${focusRing}`}
        >
          <ArrowLeftRight className="size-5 shrink-0" aria-hidden />
          <span className={label}>Switch role</span>
        </Link>
      </div>
    </div>
  );
}
