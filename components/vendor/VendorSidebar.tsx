"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Menu } from "lucide-react";
import AccountMenu from "@/components/auth/AccountMenu";
import BackButton from "@/components/ui/BackButton";
import { VENDOR_NAV } from "@/lib/vendor/nav";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

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
    <div className="flex h-full flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-16 shrink-0 items-center gap-1.5 px-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          className={`grid size-10 shrink-0 place-items-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 ${focusRing}`}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <Link
          href="/"
          onClick={onNavigate}
          className={`rounded text-xl font-extrabold tracking-tight text-emerald-700 ${focusRing} ${label}`}
          tabIndex={collapsed ? -1 : undefined}
        >
          BoothFinder
        </Link>
      </div>

      <nav aria-label="Vendor dashboard" className="flex-1 overflow-y-auto px-3 py-3">
        <BackButton fallback="/start" className="mb-1 w-full" labelClass={label} />
        <ul className="space-y-0.5">
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
                  className={`flex h-10 items-center gap-3 rounded-lg px-2.5 text-[15px] transition-colors ${focusRing} ${
                    active
                      ? "bg-neutral-100 font-semibold text-neutral-950"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950"
                  }`}
                >
                  <Icon
                    className={`size-5 shrink-0 ${active ? "text-emerald-700" : ""}`}
                    strokeWidth={active ? 2.25 : 1.75}
                    aria-hidden
                  />
                  <span className={label}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-0.5 border-t border-neutral-200 p-3">
        <AccountMenu signInHref="/signin/vendor" labelClass={label} onNavigate={onNavigate} />
        <Link
          href="/start"
          onClick={onNavigate}
          title="Back to the vendor / host choice"
          className={`flex h-10 items-center gap-3 rounded-lg px-2.5 text-[15px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950 ${focusRing}`}
        >
          <ArrowLeftRight className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className={label}>Switch role</span>
        </Link>
      </div>
    </div>
  );
}
