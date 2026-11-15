"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const TONES = {
  /** On white or off-white pages. */
  light: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-emerald-700",
  /** On the dark site header. */
  dark: "text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline-emerald-400",
};

/**
 * Goes back to the page the visitor came from. If they landed here directly
 * (a fresh tab, a shared link), there is nothing to go back to, so it goes to
 * `fallback` instead.
 *
 * `labelClass` lets a collapsible sidebar hide the word and keep the arrow.
 */
export default function BackButton({
  fallback = "/",
  tone = "light",
  className = "",
  labelClass = "",
  iconOnly = false,
}: {
  fallback?: string;
  tone?: keyof typeof TONES;
  className?: string;
  labelClass?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={iconOnly ? "Back" : undefined}
      title="Back to the previous page"
      className={`inline-flex h-10 items-center gap-3 rounded-lg px-2.5 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${TONES[tone]} ${className}`}
    >
      <ArrowLeft className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
      {!iconOnly && <span className={labelClass}>Back</span>}
    </button>
  );
}
