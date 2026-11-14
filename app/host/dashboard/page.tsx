import { Suspense } from "react";
import { connection } from "next/server";
import HostDashboard from "@/components/host/HostDashboard";
import { SAMPLE_HOST } from "@/lib/host/sampleData";

// The organizer's home. There are no organizer accounts yet (MASTER.md §2), so
// it shows the labelled sample account. When accounts exist, load the signed-in
// organizer's HostAccount in <Dashboard /> instead of SAMPLE_HOST.
export default function HostDashboardPage() {
  return (
    <Suspense fallback={<p className="p-6 text-neutral-500">Loading dashboard…</p>}>
      <Dashboard />
    </Suspense>
  );
}

/** Today's date where the events are (California), as YYYY-MM-DD. */
const todayInCalifornia = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());

async function Dashboard() {
  // "Days left to apply" depends on today's date, so this part is rendered per
  // request, not at build time (README, "Loading data in pages").
  await connection();
  return <HostDashboard account={SAMPLE_HOST} today={todayInCalifornia()} />;
}
