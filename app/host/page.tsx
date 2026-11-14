import type { Metadata } from "next";
import PageContainer from "@/components/ui/PageContainer";
import OrganizerChat from "@/components/organizers/OrganizerChat";
import { DEMO_FESTIVAL as f } from "@/lib/organizers/demoFestival";

export const metadata: Metadata = { title: "Host an event" };

// Event-host (organizer) side of the dual-sided site. The "I'm an Event Host"
// choice on /start (components/landing/RoleSelect.tsx) links here. No real accounts (MASTER.md §2):
// the "signed-in" host is the hardcoded sample festival.
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
    <PageContainer>
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
        For event hosts
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Plan your event, fill your booths</h1>
      <p className="mt-2 max-w-2xl text-neutral-300">
        Work through your festival&apos;s logistics with an AI assistant and find food and
        drink vendors that fit.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="h-fit rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Signed in as</p>
            <span className="rounded bg-amber-400/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Sample
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold">{f.name}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-neutral-400">{label}</dt>
                <dd className="text-neutral-100">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-neutral-400">
            Demo account: this festival and its vendor list are made up.
          </p>
        </aside>

        <OrganizerChat />
      </div>
    </PageContainer>
  );
}
