import { redirect } from "next/navigation";
export const instant = false;

/** The extractor lives in the organizer's Add event flow. */
export default function ExtractPage() {
  redirect("/host/dashboard/create");
}
