/**
 * The number on a map pin: the event's estimated (base-case) profit from the
 * Fit Calculator's numbers. Pure, no imports, so the tests can load it with
 * plain Node.
 */
export type ProfitPin = { text: string; tone: "gain" | "loss" };

/**
 * "+$820" (gain) or "−$150" (loss). Rounded for display only: under $100 to the
 * dollar, otherwise the nearest $10; from $10,000 up it is shortened ("+$12.4k").
 * Null when the event has no estimate, so its pin is a plain dot.
 */
export function profitPinLabel(profit: number | null | undefined): ProfitPin | null {
  if (profit == null || !Number.isFinite(profit)) return null;
  const abs = Math.abs(profit);
  const rounded = abs < 100 ? Math.round(abs) : Math.round(abs / 10) * 10;
  if (rounded === 0) return { text: "$0", tone: "gain" };
  const amount =
    rounded >= 10_000 ? `$${Number((rounded / 1000).toFixed(1))}k` : `$${rounded.toLocaleString("en-US")}`;
  return profit > 0 ? { text: `+${amount}`, tone: "gain" } : { text: `−${amount}`, tone: "loss" };
}
