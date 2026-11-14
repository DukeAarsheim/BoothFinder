// Organizer side, demo data.
//
// There are no organizer accounts (MASTER.md §2: auth is out of scope), so the
// organizer pages use this one hardcoded festival. Everything in this file is
// made up, so it is flagged `isSample` and must be shown with a "Sample" label
// in the UI (MASTER.md §6: fake data presented as real = disqualification).

export type DemoFestival = {
  isSample: true;
  name: string;
  eventType: "fair" | "race" | "market" | "festival";
  city: string;
  county: string;
  venue: string;
  /** Human-readable dates, e.g. "Sat-Sun, Sep 19-20, 2027". */
  dates: string;
  days: number;
  /** The organizer's own attendance estimate for the whole event. */
  expectedAttendance: number;
  boothSize: string;
  boothFee: number;
  applicationFee: number;
  electricityFee: number;
  /** Food and drink spots the organizer plans to fill. */
  foodVendorSpots: number;
  drinkVendorSpots: number;
  applicationDeadline: string;
  notes: string;
};

export type SampleVendor = {
  isSample: true;
  name: string;
  category: "food" | "drink";
  product: string;
  /** "Hot" or "cold" matters for weather and vendor mix. */
  serves: "hot" | "cold" | "both";
  homeCity: string;
  needsPower: boolean;
  priceRange: string;
};

export const DEMO_FESTIVAL: DemoFestival = {
  isSample: true,
  name: "Harvest on the Plaza",
  eventType: "festival",
  city: "San Luis Obispo",
  county: "San Luis Obispo",
  venue: "Outdoor downtown plaza",
  dates: "Sat-Sun, Sep 18-19, 2027",
  days: 2,
  expectedAttendance: 12000,
  boothSize: "10x10",
  boothFee: 350,
  applicationFee: 25,
  electricityFee: 50,
  foodVendorSpots: 12,
  drinkVendorSpots: 4,
  applicationDeadline: "Jul 1, 2027",
  notes: "Family-friendly harvest festival with live music, a craft area and a kids' zone. First year running it.",
};

export const SAMPLE_VENDORS: SampleVendor[] = [
  { isSample: true, name: "Coastline Cold-Press", category: "drink", product: "Bottled cold-pressed juice", serves: "cold", homeCity: "San Luis Obispo", needsPower: false, priceRange: "$7-9" },
  { isSample: true, name: "Five Cities Lemonade Co.", category: "drink", product: "Fresh lemonade and agua fresca", serves: "cold", homeCity: "Arroyo Grande", needsPower: true, priceRange: "$5-8" },
  { isSample: true, name: "Morning Fog Coffee Cart", category: "drink", product: "Espresso and cold brew", serves: "both", homeCity: "Morro Bay", needsPower: true, priceRange: "$4-7" },
  { isSample: true, name: "Valley Kombucha", category: "drink", product: "Kombucha on tap", serves: "cold", homeCity: "Paso Robles", needsPower: true, priceRange: "$6-8" },
  { isSample: true, name: "Tri-Tip Trailer", category: "food", product: "Santa Maria-style tri-tip sandwiches", serves: "hot", homeCity: "Santa Maria", needsPower: false, priceRange: "$14-18" },
  { isSample: true, name: "Masa Madre Tamales", category: "food", product: "Tamales and street tacos", serves: "hot", homeCity: "Atascadero", needsPower: true, priceRange: "$10-14" },
  { isSample: true, name: "Avocado Bowl Bar", category: "food", product: "Grain bowls and avocado toast", serves: "cold", homeCity: "Carpinteria", needsPower: false, priceRange: "$12-15" },
  { isSample: true, name: "Kettle Corn Crew", category: "food", product: "Kettle corn and roasted nuts", serves: "hot", homeCity: "Lompoc", needsPower: true, priceRange: "$6-12" },
];
