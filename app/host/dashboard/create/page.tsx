import type { Metadata } from "next";
import CreateEventFromSource from "@/components/host/CreateEventFromSource";

export const metadata: Metadata = { title: "Add event" };

// Add-event screen: type a listing in, or drop your vendor packet (or paste your
// event page) and the AI extractor fills in what it finds. Lives inside the
// organizer dashboard shell (app/host/dashboard/layout.tsx).
export default function CreateEventPage() {
  return <CreateEventFromSource />;
}
