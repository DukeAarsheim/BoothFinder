import Link from "next/link";
import { ArrowRight, CalendarPlus, Store, type LucideIcon } from "lucide-react";

type Role = {
  href: string;
  icon: LucideIcon;
  title: string;
  audience: string;
  description: string;
  cta: string;
  /** The primary role gets the filled button; the other is outlined. */
  primary?: boolean;
};

const ROLES: Role[] = [
  {
    href: "/signin/vendor",
    icon: Store,
    title: "I'm a Vendor",
    audience: "For small food and beverage brands looking for places to sell.",
    description:
      "Discover events, compare booth opportunities, and find your next profitable location.",
    cta: "Explore Events",
    primary: true,
  },
  {
    href: "/signin/host",
    icon: CalendarPlus,
    title: "I'm an Event Host",
    audience: "For event organizers looking to recruit vendors.",
    description: "Find vendors and manage opportunities for your events.",
    cta: "Host an Event",
  },
];

/**
 * The two entry paths, shown on /start. Each card is one big link.
 * Light surface: render it inside a white section.
 */
export default function RoleSelect() {
  return (
    <section aria-labelledby="role-heading">
      <h1 id="role-heading" className="text-3xl font-semibold tracking-tight text-neutral-950">
        How will you use BoothFinder?
      </h1>
      <p className="mt-2 text-neutral-600">Pick the side that fits you. You can switch at any time.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <Link
              key={role.href}
              href={role.href}
              className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-7 transition-[border-color,box-shadow] duration-150 hover:border-neutral-950 hover:shadow-[0_8px_30px_rgb(0_0_0/0.08)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 sm:p-8"
            >
              <Icon className="size-7 text-emerald-700" strokeWidth={1.75} aria-hidden />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950">
                {role.title}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">{role.audience}</p>
              <p className="mt-4 flex-1 text-[17px] leading-relaxed text-neutral-700">
                {role.description}
              </p>
              <span
                className={`mt-7 inline-flex h-11 w-fit items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors ${
                  role.primary
                    ? "bg-emerald-700 text-white group-hover:bg-emerald-800"
                    : "border border-neutral-300 text-neutral-950 group-hover:border-neutral-950"
                }`}
              >
                {role.cta}
                <ArrowRight
                  className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
