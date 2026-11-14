/**
 * Photo slots on the landing page. To fill one, put an image with that exact
 * file name in /public/landing/ (JPG, about 1200px wide is plenty). Until the
 * file exists the page shows a labelled placeholder tile instead.
 *
 * Only use photos we are allowed to use, and fill in `credit` (photographer and
 * source); it is shown on the page and belongs in MASTER.md §9 too.
 */
export type LandingPhoto = {
  file: string;
  /** Describes the picture for screen readers once the real photo is in. */
  alt: string;
  /** Short caption, also the placeholder's label. */
  label: string;
  credit?: string;
  /** Placeholder tint (Tailwind classes) so the empty layout still has color. */
  tint: string;
};

export const LANDING_PHOTOS = {
  market: { file: "market.jpg", alt: "Shoppers walking past booths at an evening farmers market", label: "Farmers market", tint: "bg-amber-100 text-amber-900" },
  festival: { file: "festival.jpg", alt: "Crowd at an outdoor festival with vendor tents", label: "Festival", tint: "bg-rose-100 text-rose-900" },
  race: { file: "race.jpg", alt: "Runners and spectators at a race finish area", label: "Race finish line", tint: "bg-sky-100 text-sky-900" },
  booth: { file: "booth.jpg", alt: "A drink vendor serving a customer at a pop-up booth", label: "Drink booth", tint: "bg-emerald-100 text-emerald-900" },
  fair: { file: "fair.jpg", alt: "A county fair midway with food stands", label: "County fair", tint: "bg-orange-100 text-orange-900" },
  streetFair: { file: "street-fair.jpg", alt: "A closed downtown street lined with vendor canopies", label: "Street fair", tint: "bg-violet-100 text-violet-900" },
} satisfies Record<string, LandingPhoto>;
