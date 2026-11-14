import { FilePlus, LayoutDashboard, type LucideIcon } from "lucide-react";

export type HostNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown as the link tooltip. */
  description: string;
  /** true = only highlight on an exact path match (use for the section root). */
  exact?: boolean;
};

/**
 * Sidebar destinations for the organizer dashboard. Same shape as VENDOR_NAV
 * (lib/vendor/nav.ts) so the two sidebars stay alike.
 * To add a page: create it under /app/host/dashboard/<name>/page.tsx and add one entry here.
 */
export const HOST_NAV: HostNavItem[] = [
  {
    label: "Dashboard",
    href: "/host/dashboard",
    icon: LayoutDashboard,
    description: "Applications, vendor mix, and messages for your events",
    exact: true,
  },
  {
    label: "Create Event",
    href: "/host/dashboard/create",
    icon: FilePlus,
    description: "Turn your vendor packet PDF into a listing",
  },
];
