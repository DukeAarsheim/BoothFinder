/**
 * The Back button's memory of where the visitor has been, so Back can skip the
 * sign-in and sign-up screens (and the trip out to Google and back). Pure
 * functions, no imports, so the tests can load this file with plain Node
 * (node --test "lib/nav/*.test.mjs").
 */

/** Pages Back never lands on: the sign-in / create-account screens. */
export function isSkipped(path: string): boolean {
  return path === "/signin" || path.startsWith("/signin/");
}

const MAX_TRAIL = 50;

/** Add the page just opened to the trail (no doubles when a page re-renders). */
export function recordVisit(trail: string[], path: string): string[] {
  if (trail[trail.length - 1] === path) return trail;
  return [...trail, path].slice(-MAX_TRAIL);
}

/**
 * Where Back should go from `current`: the most recent page that is not a
 * sign-in screen and not the page we are on. Returns that page and the trail
 * cut back to it (so pressing Back again keeps going further back), or null
 * when there is nowhere to go.
 */
export function backTarget(
  trail: string[],
  current: string,
): { target: string; trail: string[] } | null {
  let end = trail.length;
  // Drop the current page (and any sign-in screens) off the end of the trail.
  while (end > 0 && (trail[end - 1] === current || isSkipped(trail[end - 1]))) end--;
  if (end === 0) return null;
  return { target: trail[end - 1], trail: trail.slice(0, end) };
}

/**
 * Where Back goes from `current`. A fixed destination `to` (the dashboards use
 * the home page, since their other pages are in the side menu) wins and leaves
 * the trail alone; otherwise it follows the trail, then `fallback`. `trail` is
 * what to save afterwards, or null to leave it as it is.
 */
export function backDestination(args: {
  trail: string[];
  current: string;
  to?: string;
  fallback: string;
}): { target: string; trail: string[] | null } {
  if (args.to) return { target: args.to, trail: null };
  const back = backTarget(args.trail, args.current);
  return back ? { target: back.target, trail: back.trail } : { target: args.fallback, trail: null };
}
