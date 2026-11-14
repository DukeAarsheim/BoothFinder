import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import { ArrowDown } from "lucide-react";
import { uiFont } from "@/lib/vendor/font";

/** Display face for the landing headline only. Body text stays Figtree (uiFont). */
const displayFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], display: "swap" });

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";

// The landing page draws its own light header, so the site-wide dark one (in the
// protected root layout) is hidden here with one CSS rule, as the dashboards do.
const HIDE_SITE_HEADER = "body:has([data-landing]) > header { display: none; }";

/**
 * Illustrative preview of the ranked list. These are the app's labelled Sample
 * events (lib/vendor/sampleEvents.ts) with example scores, and the card says so.
 * Emerald is reserved for the primary button, so the badges are neutral.
 */
const PREVIEW = [
  { fit: 62, name: "Sample Downtown Evening Market", meta: "Apr 8 · San Luis Obispo · $60 booth fee", money: "$260", label: "est. profit", badge: "bg-neutral-950 text-white", loss: false },
  { fit: 40, name: "Sample Spring Street Fair", meta: "May 1–2 · San Luis Obispo · $175 booth fee", money: "$209", label: "est. profit", badge: "bg-stone-200 text-stone-900", loss: false },
  { fit: 20, name: "Sample County Summer Fair", meta: "Jul 21 – Aug 1 · Paso Robles · $900 booth fee", money: "−$424", label: "est. loss", badge: "bg-stone-100 text-stone-700", loss: true },
];

const STEPS = [
  { title: "Start with the crowd", body: "Expected attendance, times the share of people who buy from a booth like yours." },
  { title: "Split it with rivals", body: "Sales are shared with the other vendors selling something similar at that event." },
  { title: "Subtract what it costs", body: "Your margin on those sales, minus the booth fee and your own costs, gives the profit and the 0–100 Fit score." },
];

/** Landing page: static hero (above the fold) plus a short "how the score works" strip. */
export default function LandingHero() {
  return (
    <main data-landing className={`flex flex-1 flex-col bg-stone-50 text-neutral-950 [color-scheme:light] ${uiFont.className}`}>
      <style>{HIDE_SITE_HEADER}</style>

      <div className="flex min-h-[86svh] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-10 lg:px-16">
          <Link href="/" className={`rounded-sm text-[22px] font-extrabold tracking-tight ${displayFont.className} ${focusRing}`}>
            BoothFinder
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 text-[15px]">
            <Link href="/signin/vendor" className={`inline-flex min-h-11 items-center rounded-sm text-neutral-700 hover:text-neutral-950 ${focusRing}`}>
              For vendors
            </Link>
            <Link href="/signin/host" className={`inline-flex min-h-11 items-center rounded-sm text-neutral-700 hover:text-neutral-950 ${focusRing}`}>
              For event hosts
            </Link>
            <Link href="/start" className={`inline-flex min-h-11 items-center rounded-sm font-semibold hover:text-neutral-700 ${focusRing}`}>
              Sign in
            </Link>
          </nav>
        </header>

        <div className="flex flex-1 flex-wrap items-center gap-x-14 gap-y-10 px-6 pt-4 pb-10 sm:px-10 lg:px-16">
          <div className="min-w-0 flex-1 basis-[26rem] lg:max-w-[38rem]">
            <p className="text-sm font-semibold text-neutral-700">
              For small food and drink brands on California&apos;s Central Coast
            </p>
            <h1 className={`mt-4 text-[clamp(2.5rem,5.2vw,4.25rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance ${displayFont.className}`}>
              Know which events are worth the booth fee.
            </h1>
            <p className="mt-5 max-w-xl text-[clamp(1.05rem,1.5vw,1.25rem)] leading-normal text-neutral-700">
              BoothFinder ranks fairs, races and markets by what your brand is likely to earn, using
              your own prices and costs.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/start"
                className={`inline-flex min-h-[54px] items-center rounded-full bg-emerald-700 px-7 text-[17px] font-bold text-white transition-colors hover:bg-emerald-800 ${focusRing}`}
              >
                Find events that pay
              </Link>
              <a
                href="#how-it-works"
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm font-semibold underline underline-offset-4 hover:text-neutral-700 ${focusRing}`}
              >
                See how the score works
                <ArrowDown className="size-4" aria-hidden />
              </a>
            </div>
            <p className="mt-3 text-sm text-stone-600">Free to use. No account needed.</p>
          </div>

          <div className="min-w-0 flex-1 basis-[28rem] lg:max-w-[40rem]">
            <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_24px_60px_rgb(28_25_23/0.12)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-5 py-3.5">
                <p className="text-[15px] font-bold">Events ranked for your brand</p>
                <p className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">$8 sale · 60% margin</p>
              </div>
              <ul>
                {PREVIEW.map((row) => (
                  <li key={row.name} className="flex items-center gap-3.5 border-b border-stone-100 px-5 py-3.5">
                    <span className={`flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-[10px] ${row.badge}`}>
                      <span className="text-lg leading-none font-extrabold">{row.fit}</span>
                      <span className="text-[9px] font-bold tracking-wider">FIT</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{row.name}</span>
                      <span className="block truncate text-[13px] text-stone-600">{row.meta}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`block text-[15px] font-bold ${row.loss ? "text-red-700" : ""}`}>{row.money}</span>
                      <span className="block text-xs text-stone-600">{row.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="bg-stone-50 px-5 py-3.5">
                <p className="text-xs font-bold tracking-wider text-stone-600 uppercase">Why 62</p>
                <p className="mt-1.5 text-sm leading-normal text-stone-800">
                  5,000 people × 4% buy ÷ 3 drink vendors × $8 = <strong>$533 in sales</strong>. Keep
                  60%, pay the $60 fee: <strong>$260 profit</strong>.
                </p>
                <p className="mt-1.5 text-xs text-stone-600">Example with sample events, estimated from public data</p>
              </div>
            </div>
          </div>
        </div>

        <p className="flex flex-wrap items-center gap-x-8 gap-y-1 border-t border-stone-200 px-6 py-4 text-sm text-stone-600 sm:px-10 lg:px-16">
          <span>San Luis Obispo and Santa Barbara counties</span>
          <span className="font-semibold text-stone-700">Fairs</span>
          <span className="font-semibold text-stone-700">Races</span>
          <span className="font-semibold text-stone-700">Farmers markets</span>
          <span className="font-semibold text-stone-700">Festivals</span>
          <span className="font-semibold text-stone-700">Street fairs</span>
        </p>
      </div>

      <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-6 border-t border-stone-200 bg-white px-6 py-16 sm:px-10 lg:px-16">
        <h2 id="how-heading" className={`text-3xl font-bold tracking-tight ${displayFont.className}`}>
          How the score works
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <p className="text-sm font-bold text-stone-500">{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1.5 leading-relaxed text-neutral-700">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-stone-600">
          Every score says where it came from: estimated from public data, or based on vendor reports.
        </p>
      </section>
    </main>
  );
}
