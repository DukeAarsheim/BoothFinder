import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import RoleSelect from "@/components/landing/RoleSelect";
import BackButton from "@/components/ui/BackButton";
import { uiFont } from "@/lib/vendor/font";

export const metadata: Metadata = { title: "Get started" };

// Like the landing page, this page draws its own light header, so the site-wide
// dark one (in the protected root layout) is hidden here with one CSS rule.
/** Same wordmark face as the landing page. */
const displayFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["800"], display: "swap" });

const HIDE_SITE_HEADER = "body:has([data-start]) > header { display: none; }";

// Second step of the visitor journey: the landing page's buttons land here, and
// the visitor picks the vendor or the event-host path.
export default function StartPage() {
  return (
    <main
      data-start
      className={`flex flex-1 flex-col bg-stone-50 text-neutral-950 [color-scheme:light] ${uiFont.className}`}
    >
      <style>{HIDE_SITE_HEADER}</style>
      <header className="flex items-center gap-2 px-6 py-5 sm:px-10 lg:px-16">
        <BackButton iconOnly className="-ml-2.5" />
        <Link
          href="/"
          className={`rounded-sm text-[22px] font-extrabold tracking-tight ${displayFont.className} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700`}
        >
          BoothFinder
        </Link>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-4 pb-14 sm:px-10">
        <RoleSelect />
      </div>
    </main>
  );
}
