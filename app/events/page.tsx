import { redirect } from "next/navigation";
export const instant = false;

/** Keep old links working while taking visitors to the complete vendor flow. */
export default function EventsPage() {
  redirect("/vendor");
}
