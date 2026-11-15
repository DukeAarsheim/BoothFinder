import type { ReactNode } from "react";

/**
 * A titled, bordered block on the organizer dashboard. Uses the same hairline,
 * radius and type sizes as the vendor dashboard's lists and notices.
 * `aside` is the short note on the right of the title.
 */
export default function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-neutral-200 px-5 py-3.5">
        <h3 className="text-[15px] font-semibold text-neutral-950">{title}</h3>
        {aside && <p className="text-[13px] text-neutral-500">{aside}</p>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/** A thin progress bar. Draws nothing when there is no total to fill. */
export function Meter({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  if (max <= 0) return null;
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-neutral-200 ${className}`} aria-hidden>
      <div className="h-full rounded-full bg-emerald-700" style={{ width: `${percent}%` }} />
    </div>
  );
}
