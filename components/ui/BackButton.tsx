"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

/**
 * A floating "Back" button shown on every page except the home page. It goes
 * to the previous page in the visitor's history. When there is none (they
 * opened this page directly), it goes to the home page instead.
 * Rendered once in app/layout.tsx.
 */
export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/") return null;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="fixed right-4 bottom-4 z-[1050] inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-900 shadow-lg transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back
    </button>
  );
}
