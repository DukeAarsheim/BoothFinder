"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { backTarget, recordVisit } from "@/lib/nav/backTrail";

const TONES = {
  /** On white or off-white pages. */
  light: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-emerald-700",
  /** On the dark site header. */
  dark: "text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline-emerald-400",
};

const TRAIL_KEY = "boothfinder.backTrail";

/** The pages visited in this tab, oldest first. Empty when storage is unavailable. */
function readTrail(): string[] {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(TRAIL_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function writeTrail(trail: string[]) {
  try {
    window.sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  } catch {
    // Private windows can refuse storage; Back then falls back to `fallback`.
  }
}

/**
 * Remembers each page as it opens. The site header's Back button is on every
 * page, so the trail is kept even where no other Back button shows. Renders
 * nothing; it sits in its own Suspense because it reads the current path.
 */
function TrailRecorder() {
  const pathname = usePathname();
  useEffect(() => {
    writeTrail(recordVisit(readTrail(), window.location.pathname + window.location.search));
  }, [pathname]);
  return null;
}

/**
 * Goes back to the page the visitor came from, skipping the sign-in and
 * sign-up screens (lib/nav/backTrail.ts). If they landed here directly (a
 * fresh tab, a shared link), there is nothing to go back to, so it goes to
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
    const here = window.location.pathname + window.location.search;
    const back = backTarget(readTrail(), here);
    if (!back) {
      router.push(fallback);
      return;
    }
    writeTrail(back.trail);
    router.push(back.target);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={iconOnly ? "Back" : undefined}
      title="Back to the previous page"
      className={`inline-flex h-10 items-center gap-3 rounded-lg px-2.5 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${TONES[tone]} ${className}`}
    >
      <Suspense fallback={null}>
        <TrailRecorder />
      </Suspense>
      <ArrowLeft className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
      {!iconOnly && <span className={labelClass}>Back</span>}
    </button>
  );
}
