import { redirect } from "next/navigation";
export const instant = false;

/** The Extract tab is the vendor-side extractor. Organizers add events at /host/dashboard/create. */
export default function ExtractPage() {
  redirect("/vendor/extract");
}
