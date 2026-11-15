import Link from "next/link";
import BackButton from "./BackButton";

const NAV_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/extract", label: "Extract" },
  { href: "/rate", label: "Rate" },
  { href: "/host", label: "Host an event" },
] as const;

const focusRing =
  "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400";

/** Site-wide header and navigation. Rendered once in app/layout.tsx. */
export default function SiteHeader() {
  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
        <div className="flex items-center gap-2">
          <BackButton tone="dark" iconOnly className="-ml-2.5" />
          <Link
            href="/"
            className={`text-lg font-bold tracking-tight ${focusRing}`}
          >
            Boothfinder
          </Link>
        </div>
        <nav aria-label="Main">
          <ul className="flex items-center gap-5 text-sm text-neutral-300">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`transition-colors hover:text-white ${focusRing}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
