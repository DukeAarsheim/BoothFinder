import type { CSSProperties } from "react";
import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import { ArrowDown, ArrowRight } from "lucide-react";
import { LANDING_PHOTOS, type LandingPhoto } from "@/lib/landing/photos";
import { uiFont } from "@/lib/vendor/font";
import PhotoSlot from "./PhotoSlot";
import ScrollFall from "./ScrollFall";
import TopEventsCard from "./TopEventsCard";

/** Display face for landing headlines only. Body text stays Figtree (uiFont). */
const displayFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], display: "swap" });

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";

/*
 * Page-only CSS:
 * - hides the site-wide dark header here (the landing page draws its own);
 * - `.fall`: an element drifts by --dx/--dy, tilts by --dr and fades as --fall
 *   goes 0 → 1 (set on scroll by <ScrollFall>);
 * - `.bob`: slow idle float, so the photos feel alive before any scrolling;
 * - `.ticker`: the looping strip of event types.
 * Motion is switched off for visitors who ask for reduced motion.
 */
const PAGE_CSS = `
body:has([data-landing]) > header { display: none; }
[data-landing] .fall {
  transform: translate3d(calc(var(--fall) * var(--dx, 0px)), calc(var(--fall) * var(--dy, 0px)), 0)
    rotate(calc(var(--r0, 0deg) + var(--fall) * var(--dr, 0deg)))
    scale(calc(1 - var(--fall) * var(--shrink, 0)));
  opacity: calc(1 - var(--fall) * var(--fade, 0));
  will-change: transform, opacity;
}
@keyframes landing-bob { from { translate: 0 -5px; } to { translate: 0 6px; } }
@keyframes landing-ticker { to { transform: translateX(-50%); } }
[data-landing] .bob { animation: landing-bob var(--bob, 5s) ease-in-out infinite alternate; }
[data-landing] .ticker { animation: landing-ticker 36s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  [data-landing] .bob, [data-landing] .ticker { animation: none; }
}
`;

/** Custom properties for one falling element. */
const fall = (vars: Record<string, string | number>) => vars as CSSProperties;

/** The four photos around the preview card: where each sits and how it falls. */
const COLLAGE: { photo: LandingPhoto; place: string; vars: Record<string, string | number> }[] = [
  { photo: LANDING_PHOTOS.market, place: "left-0 top-0 h-[42%] w-[40%]", vars: { "--r0": "-5deg", "--dr": "-16deg", "--dx": "-70px", "--dy": "520px", "--bob": "5.5s" } },
  { photo: LANDING_PHOTOS.festival, place: "right-0 top-[4%] h-[36%] w-[36%]", vars: { "--r0": "4deg", "--dr": "20deg", "--dx": "90px", "--dy": "680px", "--bob": "6.5s" } },
  { photo: LANDING_PHOTOS.race, place: "left-[4%] bottom-0 h-[34%] w-[34%]", vars: { "--r0": "3deg", "--dr": "14deg", "--dx": "-40px", "--dy": "380px", "--bob": "4.5s" } },
  { photo: LANDING_PHOTOS.booth, place: "right-[2%] bottom-[3%] h-[40%] w-[38%]", vars: { "--r0": "-4deg", "--dr": "-22deg", "--dx": "60px", "--dy": "600px", "--bob": "6s" } },
];

const TICKER = ["Fairs", "Fun runs", "Farmers markets", "Festivals", "Street fairs", "Night markets", "Harvest fairs", "Half marathons"];

const STEPS = [
  { title: "Start with the crowd", body: "Expected attendance, times the share of people who buy from a booth like yours." },
  { title: "Split it with rivals", body: "Sales are shared with the other vendors selling something similar at that event." },
  { title: "Subtract what it costs", body: "Your margin on those sales, minus the booth fee and your own costs, gives the profit and the 0–100 Fit score." },
];

const SCENES = [
  { photo: LANDING_PHOTOS.fair, title: "County fairs", body: "Big crowds and big fees. See whether the math works before you pay $900 for a spot." },
  { photo: LANDING_PHOTOS.streetFair, title: "Street fairs and markets", body: "Lower fees, fewer rivals. Often the best return for a small brand." },
  { photo: LANDING_PHOTOS.race, title: "Races and fun runs", body: "A thirsty finish line and almost no competition for cold drinks." },
];

/** Per-card drift for the three-up rows: left card swings left, right card right, the middle drops straight. */
const TRIO: Record<string, string | number>[] = [
  { "--dx": "-60px", "--dy": "260px", "--dr": "-10deg", "--fade": 1.2 },
  { "--dy": "340px", "--dr": "4deg", "--fade": 1.2 },
  { "--dx": "60px", "--dy": "220px", "--dr": "12deg", "--fade": 1.2 },
];

const CREDITS = Object.values(LANDING_PHOTOS);

/** Landing page: a pinned hero, then sections, each of which falls away as you scroll past it. */
export default function LandingHero() {
  return (
    <main data-landing className={`relative flex-1 bg-stone-50 text-neutral-950 [color-scheme:light] ${uiFont.className}`}>
      <style>{PAGE_CSS}</style>

      {/* ── Hero: stays pinned while the sections below slide up over it ───── */}
      <ScrollFall className="flex h-svh min-h-[640px] flex-col overflow-hidden">
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

        <div className="flex min-h-0 flex-1 flex-wrap items-center gap-x-12 gap-y-6 px-6 pb-6 sm:px-10 lg:px-16">
          <div className="fall min-w-0 flex-1 basis-[26rem] lg:max-w-[36rem]" style={fall({ "--dy": "-90px", "--fade": 1.6, "--shrink": 0.06 })}>
            <p className="text-sm font-semibold text-neutral-700">
              For small food and drink brands on California&apos;s Central Coast
            </p>
            <h1 className={`mt-4 text-[clamp(2.4rem,5vw,4.1rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance ${displayFont.className}`}>
              Know which events are worth the booth fee.
            </h1>
            <p className="mt-5 max-w-xl text-[clamp(1.05rem,1.5vw,1.25rem)] leading-normal text-neutral-700">
              BoothFinder ranks fairs, races and markets by what your brand is likely to earn, using
              your own prices and costs.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/start"
                className={`group inline-flex min-h-[54px] items-center gap-2 rounded-full bg-emerald-700 px-7 text-[17px] font-bold text-white transition-colors hover:bg-emerald-800 ${focusRing}`}
              >
                Find events that pay
                <ArrowRight className="size-[18px] transition-transform duration-150 group-hover:translate-x-1" aria-hidden />
              </Link>
              <a href="#how-it-works" className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm font-semibold underline underline-offset-4 hover:text-neutral-700 ${focusRing}`}>
                See how the score works
                <ArrowDown className="size-4" aria-hidden />
              </a>
            </div>
          </div>

          {/* Collage: four event photos around the product preview. Hidden on small phones' first screen height by wrapping below. */}
          <div className="relative hidden aspect-[10/9] min-w-0 flex-1 basis-[30rem] md:block lg:max-w-[44rem]">
            {COLLAGE.map(({ photo, place, vars }) => (
              <div key={photo.file} className={`fall absolute ${place}`} style={fall({ "--fade": 0.5, ...vars })}>
                <div className="bob h-full w-full" style={fall({ "--bob": vars["--bob"] })}>
                  <PhotoSlot
                    photo={photo}
                    sizes="(min-width: 1024px) 280px, 30vw"
                    className="h-full w-full rounded-2xl border-4 border-white shadow-[0_18px_40px_rgb(28_25_23/0.18)]"
                  />
                </div>
              </div>
            ))}

            <div className="fall absolute top-1/2 left-1/2 w-[62%] min-w-[300px]" style={fall({ "--dy": "220px", "--shrink": 0.12, "--fade": 0.9 })}>
              <div className="-translate-x-1/2 -translate-y-1/2">
                <TopEventsCard />
              </div>
            </div>
          </div>
        </div>

        {/* Looping strip of event types (duplicated once so the loop is seamless). */}
        <div className="fall overflow-hidden border-t border-stone-200 py-3.5" style={fall({ "--fade": 2 })} aria-hidden>
          <div className="ticker flex w-max gap-10 pr-10 text-sm font-semibold whitespace-nowrap text-stone-600">
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i} className="flex items-center gap-10">
                {item}
                <span className="size-1.5 rounded-full bg-stone-300" />
              </span>
            ))}
          </div>
        </div>
        <p className="sr-only">Covers {TICKER.join(", ").toLowerCase()} in San Luis Obispo and Santa Barbara counties.</p>
      </ScrollFall>

      {/* ── Everything below slides up over the pinned hero ───────────────── */}
      <div className="relative z-10 overflow-x-clip rounded-t-[2rem] bg-white shadow-[0_-24px_60px_rgb(28_25_23/0.14)]">
        {/* Each section sits above the one before it, so falling content slips behind the next section. */}
        <ScrollFall as="section" mode="exit" id="how-it-works" aria-labelledby="how-heading" className="z-[1] scroll-mt-6 rounded-t-[2rem] bg-white px-6 pt-16 pb-14 sm:px-10 lg:px-16">
          <h2 id="how-heading" style={fall({ "--dy": "-40px", "--fade": 1.6 })} className={`fall text-3xl font-bold tracking-tight sm:text-4xl ${displayFont.className}`}>
            How the score works
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} style={fall(TRIO[i])} className="fall rounded-2xl border border-stone-200 bg-white p-6">
                <p className={`text-3xl font-extrabold text-stone-300 ${displayFont.className}`}>{i + 1}</p>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1.5 leading-relaxed text-neutral-700">{step.body}</p>
              </li>
            ))}
          </ol>
          <p style={fall({ "--fade": 2 })} className="fall mt-6 text-sm text-stone-600">
            Every score says where it came from: estimated from public data, or based on vendor reports.
          </p>
        </ScrollFall>

        <ScrollFall as="section" mode="exit" aria-labelledby="scenes-heading" className="z-[2] bg-stone-50 px-6 py-16 sm:px-10 lg:px-16">
          <h2 id="scenes-heading" style={fall({ "--dy": "-40px", "--fade": 1.6 })} className={`fall max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl ${displayFont.className}`}>
            Every kind of event, one honest number.
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {SCENES.map((scene, i) => (
              <li key={scene.title} style={fall(TRIO[i])} className="fall group overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow duration-200 hover:shadow-[0_16px_40px_rgb(28_25_23/0.12)]">
                <PhotoSlot
                  photo={scene.photo}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="p-5">
                  <h3 className="text-lg font-semibold">{scene.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-neutral-700">{scene.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </ScrollFall>

        <section aria-labelledby="cta-heading" className="relative z-[3] bg-neutral-950 px-6 py-20 text-center text-white [color-scheme:dark] sm:px-10">
          <h2 id="cta-heading" className={`mx-auto max-w-3xl text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl ${displayFont.className}`}>
            Your next booth is out there. Pick the one that pays.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              href="/start"
              className="group inline-flex min-h-[54px] items-center gap-2 rounded-full bg-emerald-600 px-7 text-[17px] font-bold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Find events that pay
              <ArrowRight className="size-[18px] transition-transform duration-150 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link href="/signin/host" className="inline-flex min-h-11 items-center rounded-sm font-semibold underline underline-offset-4 hover:text-stone-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Hosting an event? List it
            </Link>
          </div>

          <div className="mx-auto mt-16 max-w-4xl border-t border-neutral-800 pt-6 text-left text-xs leading-relaxed text-stone-400">
            <p className="font-semibold text-stone-300">Photo credits</p>
            <p className="mt-1">
              Photos show real California events for illustration, from Wikimedia Commons. The events and
              photographers are not affiliated with BoothFinder.
            </p>
            <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {CREDITS.map((photo) => (
                <li key={photo.file}>
                  <a href={photo.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                    {photo.label}
                  </a>
                  : {photo.credit}, {photo.license}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
