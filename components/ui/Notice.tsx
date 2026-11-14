import type { ReactNode } from "react";

type NoticeTone = "info" | "warning" | "error";

const toneClasses: Record<NoticeTone, { box: string; label: string }> = {
  info: {
    box: "border-neutral-800 bg-neutral-900/60",
    label: "bg-neutral-800 text-neutral-200",
  },
  warning: {
    box: "border-amber-400/30 bg-amber-400/5",
    label: "bg-amber-400/15 text-amber-300",
  },
  error: {
    box: "border-red-400/30 bg-red-400/5",
    label: "bg-red-400/15 text-red-300",
  },
};

/**
 * A boxed message for empty states, setup problems, errors, and
 * "not built yet" placeholders.
 */
export default function Notice({
  title,
  label,
  tone = "info",
  children,
}: {
  title: string;
  /** Optional short tag shown above the title, e.g. "Not built yet". */
  label?: string;
  tone?: NoticeTone;
  children?: ReactNode;
}) {
  const classes = toneClasses[tone];
  return (
    <div className={`rounded-lg border p-5 ${classes.box}`}>
      {label && (
        <p
          className={`mb-3 inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${classes.label}`}
        >
          {label}
        </p>
      )}
      <p className="font-semibold">{title}</p>
      {children && (
        <div className="mt-2 max-w-prose space-y-2 text-sm text-neutral-300">
          {children}
        </div>
      )}
    </div>
  );
}
