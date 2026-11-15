import { Suspense } from "react";
import HostDashboard from "@/components/host/HostDashboard";
import { loadHostEvents } from "@/lib/host/loadEvents";

export default function HostDashboardPage() {
  return (
    <Suspense
      fallback={<p className="p-6 text-neutral-500">Loading dashboard…</p>}
    >
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const { events, error } = await loadHostEvents();
  return <HostDashboard events={events} error={error} />;
}
