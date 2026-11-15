import type { ReactNode } from "react";
import RequireSignIn from "@/components/auth/RequireSignIn";

// Every organizer page (/host and /host/dashboard/...) needs a sign-in made on
// the organizer side. Visitors without one are sent to /signin/host.
export default function HostLayout({ children }: { children: ReactNode }) {
  return <RequireSignIn role="host">{children}</RequireSignIn>;
}
