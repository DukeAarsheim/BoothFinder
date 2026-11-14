import type { ReactNode } from "react";

type Tone = "info" | "warning" | "error";

const tones: Record<Tone, string> = {
  info: "border-neutral-200 bg-neutral-50",
  warning: "border-amber-200 bg-amber-50",
  error: "border-red-200 bg-red-50",
};

/**
 * Light-theme message box for the vendor dashboard (empty states, errors,
 * "not built yet"). The shared components/ui/Notice is styled for dark pages.
 */
export default function VendorNotice({
  title,
  tone = "info",
  children,
}: {
  title: string;
  tone?: Tone;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-xl border px-5 py-4 ${tones[tone]}`}>
      <p className="font-semibold text-neutral-900">{title}</p>
      {children && (
        <div className="mt-1 max-w-prose space-y-2 text-sm text-neutral-600">{children}</div>
      )}
    </div>
  );
}

/** MASTER.md §6: made-up rows must be visibly labeled. */
export function SampleTag() {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      Sample
    </span>
  );
}
