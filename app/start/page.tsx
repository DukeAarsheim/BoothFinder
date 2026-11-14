import type { Metadata } from "next";
import RoleSelect from "@/components/landing/RoleSelect";
import { uiFont } from "@/lib/vendor/font";

export const metadata: Metadata = { title: "Get started" };

// Second step of the visitor journey: the launch page's "Browse events" button
// lands here, and the visitor picks the vendor or the event-host path.
export default function StartPage() {
  return (
    // Light surface (the root theme is dark, so set colors explicitly).
    <main
      className={`flex flex-1 flex-col justify-center bg-white px-6 py-14 text-neutral-900 [color-scheme:light] ${uiFont.className}`}
    >
      <div className="mx-auto w-full max-w-5xl">
        <RoleSelect />
      </div>
    </main>
  );
}
