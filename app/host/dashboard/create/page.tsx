import type { Metadata } from "next";
import CreateEventFromSource from "@/components/host/CreateEventFromSource";

export const metadata: Metadata = { title: "Create event" };

// Organizer side of the AI extractor: drop your vendor packet (or paste your
// event page) and get a listing to check and publish. Lives inside the
// organizer dashboard shell (app/host/dashboard/layout.tsx).
export default function CreateEventPage() {
  return <CreateEventFromSource />;
}
