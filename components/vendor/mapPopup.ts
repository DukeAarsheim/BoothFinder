import type { LocatedEvent } from "@/lib/vendor/geo";
import { whenLine } from "@/lib/vendor/cleanEvent";
import { feeSummary, formatLocation } from "@/lib/vendor/format";

/** Popup built with DOM nodes (textContent), so event text is never parsed as HTML. */
export function popupContent({ event, precision }: LocatedEvent) {
  const el = (tag: string, className: string, text?: string | null) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const root = el("div", "space-y-0.5");
  root.append(el("p", "!m-0 text-sm font-semibold leading-snug text-neutral-950", event.name));
  // Dates, an expected window, or (for a weekly market) its schedule.
  const when = whenLine(event);
  const meta = [when, formatLocation(event)]
    .filter(Boolean)
    .join(" · ");
  if (meta) root.append(el("p", "!m-0 text-[13px] text-neutral-600", meta));
  const fee = feeSummary(event);
  const feeLine = el("p", "!m-0 !mt-1.5 flex items-center gap-2 text-[13px] text-neutral-950");
  feeLine.append(el("span", fee ? "font-semibold" : "text-neutral-500", fee ? `${fee.value} ${fee.label}` : "Fee not listed"));
  if (event.is_sample) {
    feeLine.append(el("span", "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900", "Sample"));
  }
  root.append(feeLine);
  if (precision === "county") {
    root.append(el("p", "!m-0 text-xs text-neutral-500", "Placed at the county seat; city not listed"));
  }
  const details = el("a", "!mt-2 inline-block text-sm font-semibold text-emerald-700 underline", "View event details") as HTMLAnchorElement;
  details.href = `/vendor/events/${encodeURIComponent(event.id)}`;
  root.append(details);
  return root;
}
