import {
  Bookmark,
  Calculator,
  FileSearch,
  Map as MapIcon,
  type LucideIcon,
} from "lucide-react";

export type VendorNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Short line shown under the page title and as the link tooltip. */
  description: string;
  /** true = only highlight on an exact path match (use for the section root). */
  exact?: boolean;
};

/**
 * Sidebar destinations for the vendor dashboard.
 * To add a page: create it under /app/vendor/<name>/page.tsx and add one entry here.
 */
export const VENDOR_NAV: VendorNavItem[] = [
  {
    label: "Explore Events",
    href: "/vendor",
    icon: MapIcon,
    description: "Map and list of events seeking vendors",
    exact: true,
  },
  {
    label: "Saved Events",
    href: "/vendor/saved",
    icon: Bookmark,
    description: "Opportunities you bookmarked",
  },
  {
    label: "Fit Calculator",
    href: "/vendor/fit",
    icon: Calculator,
    description: "Your prices, margin, and costs",
  },
  {
    // The extractor has its own card and lives at /extract (outside the dashboard shell).
    label: "Event Extractor",
    href: "/extract",
    icon: FileSearch,
    description: "Turn a vendor PDF or web page into a listing",
  },
];
