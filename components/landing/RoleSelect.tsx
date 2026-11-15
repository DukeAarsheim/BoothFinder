import Link from "next/link";
import { Bricolage_Grotesque } from "next/font/google";
import { ArrowRight, Check } from "lucide-react";
import { LANDING_PHOTOS, type LandingPhoto } from "@/lib/landing/photos";
import PhotoSlot from "./PhotoSlot";

/** Same display face as the landing page headline. */
const displayFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], display: "swap" });

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700";

type Role = {
  href: string;
  title: string;
  audience: string;
  lead: string;
  points: string[];
  cta: string;
  /** Three photos: one large, two small. */
  photos: [LandingPhoto, LandingPhoto, LandingPhoto];
  /** Accent classes for this side (pill, check marks, button, hover ring). */
  pill: string;
  check: string;
  button: string;
  ring: string;
};

const ROLES: Role[] = [
  {
    href: "/signin/vendor",
    title: "I'm a vendor",
    audience: "For food and drink brands",
    lead: "Find the events worth your booth fee.",
    points: [
      "Events ranked by what they're likely to earn you",
      "Fees, deadlines and crowd size in one place",
      "Save the ones you like and compare them",
    ],
    cta: "Explore events",
    photos: [LANDING_PHOTOS.booth, LANDING_PHOTOS.market, LANDING_PHOTOS.fair],
    pill: "bg-amber-100 text-amber-900",
    check: "bg-amber-100 text-amber-800",
    button: "bg-emerald-700 text-white group-hover:bg-emerald-800",
    ring: "hover:border-amber-400 hover:shadow-[0_24px_60px_rgb(217_119_6/0.18)]",
  },
  {
    href: "/signin/host",
    title: "I'm an event host",
    audience: "For event organizers",
    lead: "Fill your vendor spots with brands that fit.",
    points: [
      "Turn your vendor packet into a listing in minutes",
      "Track applications and your food and drink mix",
      "See how vendors rate your event",
    ],
    cta: "Host an event",
    photos: [LANDING_PHOTOS.festival, LANDING_PHOTOS.streetFair, LANDING_PHOTOS.race],
    pill: "bg-sky-100 text-sky-900",
    check: "bg-sky-100 text-sky-800",
    button: "bg-neutral-950 text-white group-hover:bg-neutral-800",
    ring: "hover:border-sky-400 hover:shadow-[0_24px_60px_rgb(2_132_199/0.18)]",
  },
];

const CREDITS = [...new Map(ROLES.flatMap((r) => r.photos).map((p) => [p.file, p])).values()];

/**
 * The two entry paths, shown on /start. Each card is one big link to that
 * side's sign-in step, with a small collage of real California event photos.
 * Light surface: render it inside a light section.
 */
export default function RoleSelect() {
  return (
    <section aria-labelledby="role-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-sm font-semibold text-stone-600">Step 1 of 2 · then sign in, or continue as a guest</p>
          <h1
            id="role-heading"
            className={`mt-2 text-[clamp(2.1rem,4.4vw,3.4rem)] leading-[1.04] font-extrabold tracking-[-0.03em] text-neutral-950 ${displayFont.className}`}
          >
            Who are you here as?
          </h1>
          <p className="mt-3 text-lg text-stone-700">Pick the side that fits you. You can switch at any time.</p>
        </div>
        <Link
          href="/vendor"
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm font-semibold text-neutral-950 underline underline-offset-4 hover:text-stone-700 ${focusRing}`}
        >
          Just looking? Browse events
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-9 grid gap-6 md:grid-cols-2">
        {ROLES.map((role) => (
          <Link
            key={role.href}
            href={role.href}
            className={`group flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_2px_8px_rgb(28_25_23/0.06)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${role.ring} ${focusRing}`}
          >
            {/* Collage: one large photo, two stacked small ones. */}
            <div className="grid h-60 grid-cols-3 grid-rows-2 gap-1.5 p-1.5 sm:h-64">
              <PhotoSlot
                photo={role.photos[0]}
                caption={false}
                sizes="(min-width: 768px) 30vw, 66vw"
                className="col-span-2 row-span-2 rounded-[1.25rem] [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.04]"
              />
              <PhotoSlot photo={role.photos[1]} caption={false} sizes="(min-width: 768px) 15vw, 33vw" className="rounded-[1rem]" />
              <PhotoSlot photo={role.photos[2]} caption={false} sizes="(min-width: 768px) 15vw, 33vw" className="rounded-[1rem]" />
            </div>

            <div className="flex flex-1 flex-col px-7 pt-5 pb-7">
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${role.pill}`}>{role.audience}</span>
              <h2 className={`mt-3 text-3xl font-extrabold tracking-tight text-neutral-950 ${displayFont.className}`}>
                {role.title}
              </h2>
              <p className="mt-1 text-[17px] text-stone-700">{role.lead}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {role.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[15px] text-stone-800">
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${role.check}`}>
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <span
                className={`mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-full px-6 text-[15px] font-bold transition-colors ${role.button}`}
              >
                {role.cta}
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-1" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-xs leading-relaxed text-stone-500">
        Photos of real California events, from Wikimedia Commons:{" "}
        {CREDITS.map((photo, i) => (
          <span key={photo.file}>
            <a href={photo.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-stone-800">
              {photo.label}
            </a>{" "}
            ({photo.credit}, {photo.license}){i < CREDITS.length - 1 ? "; " : "."}
          </span>
        ))}
      </p>
    </section>
  );
}
