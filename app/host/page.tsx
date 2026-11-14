import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import OrganizerChat from "@/components/organizers/OrganizerChat";
import { SampleTag } from "@/components/vendor/VendorNotice";
import { DEMO_FESTIVAL as f } from "@/lib/organizers/demoFestival";
import { uiFont } from "@/lib/vendor/font";

export const metadata: Metadata = { title: "Host an event" };

// Event-host (organizer) side of the dual-sided site. The "I'm an Event Host"
// choice on /start (components/landing/RoleSelect.tsx) links here. No real
// accounts (MASTER.md §2): the "signed-in" host is the hardcoded sample festival.
// Light surface to match /start and /vendor (the root theme is dark).
export default function HostPage() {
  const facts: [string, string][] = [
    ["Dates", f.dates],
    ["Where", `${f.venue}, ${f.city}`],
    ["Expected attendance", f.expectedAttendance.toLocaleString("en-US")],
    ["Booth", `${f.boothSize}, $${f.boothFee} + $${f.applicationFee} application`],
    ["Power", `$${f.electricityFee}`],
    ["Vendor spots", `${f.foodVendorSpots} food, ${f.drinkVendorSpots} drink`],
    ["Application deadline", f.applicationDeadline],
  ];

  return (
    <main
      className={`flex-1 bg-white text-neutral-900 [color-scheme:light] ${uiFont.className}`}
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-14">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CalendarPlus className="size-4" strokeWidth={2} aria-hidden />
          For event hosts
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
          Plan your event, fill your booths
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-600">
          Work through your festival&apos;s logistics with an AI assistant and find food and
          drink vendors that fit.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
          <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Signed in as
              </p>
              <SampleTag />
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">
              {f.name}
            </h2>
            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-neutral-500">{label}</dt>
                  <dd className="font-medium text-neutral-900">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
              Demo account: this festival and its vendor list are made up.
            </p>
          </aside>

          <OrganizerChat />
        </div>
      </div>
    </main>
  );
}
