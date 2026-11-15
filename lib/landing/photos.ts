/**
 * Photos on the landing page. Files live in /public/landing/. If a file is
 * missing, the page shows a labelled placeholder tile instead.
 *
 * These are freely licensed photos of real California events from Wikimedia
 * Commons. Each licence requires credit, so `credit`, `license` and `source`
 * are shown on the page (captions and the credits list) and in MASTER.md §9.
 * To swap one: replace the file and update its entry here.
 */
export type LandingPhoto = {
  file: string;
  /** Describes the picture for screen readers. */
  alt: string;
  /** Caption: what and where the photo really is. */
  label: string;
  credit?: string;
  license?: string;
  /** The photo's page on Wikimedia Commons. */
  source?: string;
  /** Placeholder tint (Tailwind classes), used only while the file is missing. */
  tint: string;
};

const COMMONS = "https://commons.wikimedia.org/wiki/File:";

export const LANDING_PHOTOS = {
  market: {
    file: "market.jpg",
    alt: "Shoppers walking between rows of white canopies at a farmers market",
    label: "Pacific Palisades farmers market, Los Angeles",
    credit: "Idéalités",
    license: "CC BY 4.0",
    source: `${COMMONS}Farmer_Market_in_Pacific_Palisades.jpg`,
    tint: "bg-amber-100 text-amber-900",
  },
  festival: {
    file: "festival.jpg",
    alt: "Festival-goers on a lawn ringed by white vendor tents under a blue sky",
    label: "Gilroy Garlic Festival, 2018",
    credit: "FASTILY",
    license: "CC BY-SA 4.0",
    source: `${COMMONS}Gilroy_Garlic_Festival_3_2018-08-06.jpg`,
    tint: "bg-rose-100 text-rose-900",
  },
  race: {
    file: "race.jpg",
    alt: "Runners competing in a road marathon",
    label: "Santa Barbara Marathon, 2012",
    credit: "Glenn Beltz",
    license: "CC BY 2.0",
    source: `${COMMONS}Santa_Barbara_Marathon_2012.jpg`,
    tint: "bg-sky-100 text-sky-900",
  },
  booth: {
    file: "booth.jpg",
    alt: "A lemonade stand shaped like a giant lemon at a county fair",
    label: "Lemonade stand, Marin County Fair, 2023",
    credit: "Sarah Stierch",
    license: "CC BY 4.0",
    source: `${COMMONS}Phil%27s_Fresh_Squeezed_Lemonade_-_2023_Marin_County_Fair_-_Sarah_Stierch.jpg`,
    tint: "bg-emerald-100 text-emerald-900",
  },
  fair: {
    file: "fair.jpg",
    alt: "A red trackless train carrying visitors past food stands at a county fair",
    label: "Marin County Fair, 2023",
    credit: "Sarah Stierch",
    license: "CC BY 4.0",
    source: `${COMMONS}2023_Marin_County_Fair_-_Sarah_Stierch_11.jpg`,
    tint: "bg-orange-100 text-orange-900",
  },
  streetFair: {
    file: "street-fair.jpg",
    alt: "Aerial view of a long street packed with people and vendor canopies",
    label: "Solano Stroll street fair, Albany and Berkeley",
    credit: "Noah Salzman",
    license: "CC BY-SA 4.0",
    source: `${COMMONS}Solano_Stroll,_view_from_the_air.jpg`,
    tint: "bg-violet-100 text-violet-900",
  },
} satisfies Record<string, LandingPhoto>;
