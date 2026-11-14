import Link from "next/link";
import { ArrowRight, CalendarPlus, Store, type LucideIcon } from "lucide-react";

type Role = {
  href: string;
  icon: LucideIcon;
  title: string;
  audience: string;
  description: string;
  cta: string;
  /** Tailwind classes for this role's accent color. */
  accent: { icon: string; glow: string; border: string; button: string };
};

const ROLES: Role[] = [
  {
    href: "/vendor",
    icon: Store,
    title: "I'm a Vendor",
    audience: "For small food and beverage brands looking for places to sell.",
    description:
      "Discover events, compare booth opportunities, and find your next profitable location.",
    cta: "Explore Events",
    accent: {
      icon: "bg-emerald-400/15 text-emerald-300",
      glow: "from-emerald-400/20",
      border: "hover:border-emerald-400/70 focus-visible:outline-emerald-400",
      button: "bg-emerald-400 text-neutral-950 group-hover:bg-emerald-300",
    },
  },
  {
    href: "/host",
    icon: CalendarPlus,
    title: "I'm an Event Host",
    audience: "For event organizers looking to recruit vendors.",
    description: "Find vendors and manage opportunities for your events.",
    cta: "Host an Event",
    accent: {
      icon: "bg-orange-400/15 text-orange-300",
      glow: "from-orange-400/20",
      border: "hover:border-orange-400/70 focus-visible:outline-orange-400",
      button: "bg-orange-400 text-neutral-950 group-hover:bg-orange-300",
    },
  },
];

/**
 * The two entry paths, shown on the home page. Each card is one big link.
 * Self-contained, so the landing hero (MASTER.md §12) can sit above or below it.
 */
export default function RoleSelect() {
  return (
    <section aria-labelledby="role-heading">
      <h2 id="role-heading" className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
        How will you use BoothFinder?
      </h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <Link
              key={role.href}
              href={role.href}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:hover:translate-y-0 sm:p-8 ${role.accent.border}`}
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-radial ${role.accent.glow} to-transparent to-70% opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />
              <span className={`grid size-14 place-items-center rounded-xl ${role.accent.icon}`}>
                <Icon className="size-7" aria-hidden />
              </span>
              <h3 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{role.title}</h3>
              <p className="mt-2 text-sm text-neutral-400">{role.audience}</p>
              <p className="mt-4 flex-1 text-lg text-neutral-200">{role.description}</p>
              <span
                className={`mt-8 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 font-semibold transition-colors ${role.accent.button}`}
              >
                {role.cta}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
