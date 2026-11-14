/**
 * MADE-UP organizer account for the dashboard at /host/dashboard.
 *
 * There are no organizer accounts yet, and no tables for applications, messages
 * or listing activity, so the dashboard shows this one account. Every event here
 * has is_sample = true and the UI labels it "Sample" (MASTER.md §6). None of it
 * is ever written to the database.
 *
 * "Harvest on the Plaza" mirrors the sample festival in
 * lib/organizers/demoFestival.ts on the feat/organizer-assistant branch, so the
 * dashboard and the organizer assistant describe the same event. Once that
 * branch is merged, read the shared facts from one place.
 *
 * Type-only imports on purpose: see metrics.ts.
 */
import type { EventRow, VendorCategory } from "@/lib/types";
import type { Applicant, ApplicantStatus, HostAccount } from "./types";

/** A full `events` row. Anything the organizer hasn't filled in stays null. */
function listing(
  id: string,
  fields: Partial<EventRow> & Pick<EventRow, "name" | "event_type">,
): EventRow {
  return {
    id,
    is_sample: true,
    created_via: "manual",
    created_at: "2026-11-14T00:00:00Z",
    updated_at: "2026-11-14T00:00:00Z",
    application_deadline: null,
    application_fee: null,
    apply_url: null,
    attendance_source: null,
    booth_fee_max: null,
    booth_fee_min: null,
    booth_size: null,
    city: null,
    county: null,
    day_type: null,
    electricity_fee: null,
    end_date: null,
    expected_attendance: null,
    fee_info_year: null,
    fee_notes: null,
    fee_pct_of_sales: null,
    how_to_apply: null,
    notes: null,
    schedule_notes: null,
    similar_vendor_limit: null,
    source_url: null,
    start_date: null,
    vendor_spots: null,
    venue: null,
    ...fields,
  };
}

type Vendor = readonly [name: string, category: VendorCategory, product: string];

/** Made-up vendors. The first eight names match the sample vendors on feat/organizer-assistant. */
const V = {
  // Drink
  coastline: ["Coastline Cold-Press", "drink", "Bottled cold-pressed juice"],
  fiveCities: ["Five Cities Lemonade Co.", "drink", "Fresh lemonade and agua fresca"],
  morningFog: ["Morning Fog Coffee Cart", "drink", "Espresso and cold brew"],
  valleyKombucha: ["Valley Kombucha", "drink", "Kombucha on tap"],
  pierBoba: ["Pier Street Boba", "drink", "Milk tea and fruit tea"],
  oakBarrel: ["Oak Barrel Soda Works", "drink", "Craft sodas"],
  harborChai: ["Harbor Chai Co.", "drink", "Hot and iced chai"],
  emberCider: ["Ember Cider House", "drink", "Hot spiced apple cider"],
  // Food
  triTip: ["Tri-Tip Trailer", "food", "Santa Maria-style tri-tip sandwiches"],
  masaMadre: ["Masa Madre Tamales", "food", "Tamales and street tacos"],
  avocadoBowl: ["Avocado Bowl Bar", "food", "Grain bowls and avocado toast"],
  kettleCorn: ["Kettle Corn Crew", "food", "Kettle corn and roasted nuts"],
  woodOven: ["Wood Oven Wanderer", "food", "Wood-fired pizza"],
  duneDumplings: ["Dune Dumplings", "food", "Steamed and pan-fried dumplings"],
  goldenChurros: ["Golden Hour Churros", "food", "Churros and hot chocolate"],
  saltSmoke: ["Salt and Smoke BBQ", "food", "Pulled pork and brisket"],
  orchardPies: ["Little Orchard Pies", "food", "Hand pies and tarts"],
  esteroTacos: ["Estero Fish Tacos", "food", "Baja-style fish tacos"],
  honeycombCrepes: ["Honeycomb Crepes", "food", "Sweet and savory crepes"],
  ridgeBurgers: ["Ridge Road Burgers", "food", "Smash burgers and fries"],
  gardenGyro: ["Garden Gyro Stand", "food", "Gyros and falafel"],
  sweetBay: ["Sweet Bay Gelato", "food", "Small-batch gelato"],
  pasoPretzel: ["Paso Pretzel Co.", "food", "Soft pretzels and dips"],
  nightOwl: ["Night Owl Noodles", "food", "Garlic noodles and bao"],
  // Other
  tidepool: ["Tidepool Ceramics", "other", "Handmade ceramics"],
  sagebrush: ["Sagebrush Soap Works", "other", "Soaps and candles"],
  lupine: ["Lupine Letterpress", "other", "Cards and prints"],
  fogFlowers: ["Coastal Fog Flowers", "other", "Bouquets and wreaths"],
  threeRocks: ["Three Rocks Jewelry", "other", "Silver jewelry"],
  cypress: ["Cypress Woodcraft", "other", "Cutting boards and wooden toys"],
} as const satisfies Record<string, Vendor>;

const applied = (vendor: Vendor, status: ApplicantStatus, appliedOn: string): Applicant => ({
  vendor: vendor[0],
  category: vendor[1],
  product: vendor[2],
  status,
  appliedOn,
});

export const SAMPLE_HOST: HostAccount = {
  isSample: true,
  organizer: "Plaza Events Co.",
  events: [
    // An established market close to its deadline: nearly full, drink at its limit,
    // and every listing detail filled in.
    {
      event: listing("host-sample-1", {
        name: "Holiday Night Market",
        event_type: "market",
        start_date: "2026-12-12",
        day_type: "weekend",
        schedule_notes: "Saturday, 4 to 9 PM",
        venue: "Downtown park",
        city: "Paso Robles",
        county: "San Luis Obispo",
        application_deadline: "2026-11-23",
        booth_fee_min: 180,
        booth_fee_max: 180,
        application_fee: 20,
        electricity_fee: 35,
        fee_info_year: 2026,
        booth_size: "10x10",
        expected_attendance: 6500,
        attendance_source: "2025 gate count",
        vendor_spots: 24,
        similar_vendor_limit: "4 drink vendors",
      }),
      limits: { food: 10, drink: 4, other: 10 },
      applicants: [
        applied(V.triTip, "accepted", "2026-10-05"),
        applied(V.morningFog, "accepted", "2026-10-05"),
        applied(V.masaMadre, "accepted", "2026-10-06"),
        applied(V.tidepool, "accepted", "2026-10-07"),
        applied(V.kettleCorn, "accepted", "2026-10-08"),
        applied(V.harborChai, "accepted", "2026-10-09"),
        applied(V.sagebrush, "accepted", "2026-10-10"),
        applied(V.woodOven, "accepted", "2026-10-12"),
        applied(V.emberCider, "accepted", "2026-10-13"),
        applied(V.duneDumplings, "accepted", "2026-10-14"),
        applied(V.goldenChurros, "accepted", "2026-10-15"),
        applied(V.lupine, "accepted", "2026-10-16"),
        applied(V.orchardPies, "accepted", "2026-10-19"),
        applied(V.coastline, "accepted", "2026-10-20"),
        applied(V.fogFlowers, "accepted", "2026-10-21"),
        applied(V.honeycombCrepes, "accepted", "2026-10-22"),
        applied(V.pierBoba, "waitlisted", "2026-10-24"),
        applied(V.nightOwl, "accepted", "2026-10-26"),
        applied(V.threeRocks, "accepted", "2026-10-27"),
        applied(V.fiveCities, "declined", "2026-10-28"),
        applied(V.cypress, "accepted", "2026-10-29"),
        applied(V.oakBarrel, "waitlisted", "2026-10-30"),
        applied(V.avocadoBowl, "declined", "2026-11-01"),
        applied(V.valleyKombucha, "waitlisted", "2026-11-03"),
        applied(V.saltSmoke, "new", "2026-11-09"),
        applied(V.pasoPretzel, "new", "2026-11-10"),
        applied(V.sweetBay, "new", "2026-11-11"),
        applied(V.gardenGyro, "new", "2026-11-12"),
        applied(V.ridgeBurgers, "new", "2026-11-13"),
      ],
      pastVendorListYear: 2025,
      ratings: { reports: 14, audienceFit: 4.3, organization: 4.6 },
      returningVendorRate: 0.62,
      fitRanges: [
        { vendorType: "Cold drinks", low: 48, high: 61 },
        { vendorType: "Hot food and drinks", low: 66, high: 82 },
      ],
      countyMedianFeePerAttendee: 0.04,
      activity: { views: 1480, saves: 112, applyClicks: 47 },
    },

    // A first-year festival early in its applications: no vendor reports, no past
    // vendor list, and an attendance estimate with no source.
    {
      event: listing("host-sample-2", {
        name: "Harvest on the Plaza",
        event_type: "festival",
        start_date: "2027-09-18",
        end_date: "2027-09-19",
        day_type: "weekend",
        venue: "Outdoor downtown plaza",
        city: "San Luis Obispo",
        county: "San Luis Obispo",
        application_deadline: "2027-07-01",
        booth_fee_min: 350,
        booth_fee_max: 350,
        application_fee: 25,
        electricity_fee: 50,
        fee_info_year: 2027,
        booth_size: "10x10",
        expected_attendance: 12000,
        vendor_spots: 16,
        similar_vendor_limit: "4 drink vendors",
        notes:
          "Family-friendly harvest festival with live music, a craft area and a kids' zone. First year running it.",
      }),
      limits: { food: 12, drink: 4, other: 0 },
      applicants: [
        applied(V.triTip, "accepted", "2026-11-02"),
        applied(V.coastline, "accepted", "2026-11-02"),
        applied(V.masaMadre, "accepted", "2026-11-03"),
        applied(V.ridgeBurgers, "declined", "2026-11-04"),
        applied(V.avocadoBowl, "accepted", "2026-11-05"),
        applied(V.fiveCities, "accepted", "2026-11-06"),
        applied(V.duneDumplings, "new", "2026-11-07"),
        applied(V.kettleCorn, "new", "2026-11-09"),
        applied(V.valleyKombucha, "new", "2026-11-10"),
        applied(V.woodOven, "new", "2026-11-12"),
      ],
      pastVendorListYear: null,
      ratings: null,
      returningVendorRate: null,
      fitRanges: [
        { vendorType: "Cold drinks", low: 64, high: 79 },
        { vendorType: "Hot food and drinks", low: 58, high: 72 },
      ],
      countyMedianFeePerAttendee: 0.04,
      activity: { views: 1240, saves: 86, applyClicks: 41 },
    },

    // A street fair with gaps in its listing: no attendance and no electricity
    // fee, so vendors see "Estimated" scores.
    {
      event: listing("host-sample-3", {
        name: "Spring Street Fair",
        event_type: "street_fair",
        start_date: "2027-05-01",
        end_date: "2027-05-02",
        day_type: "weekend",
        venue: "Main Street, downtown",
        city: "Santa Maria",
        county: "Santa Barbara",
        application_deadline: "2027-03-01",
        booth_fee_min: 225,
        booth_fee_max: 400,
        fee_notes: "$225 for a 10x10, $400 for a 10x20 corner booth",
        fee_info_year: 2027,
        booth_size: "10x10 or 10x20",
        vendor_spots: 20,
        similar_vendor_limit: "3 drink vendors",
      }),
      limits: { food: 8, drink: 3, other: 9 },
      applicants: [
        applied(V.esteroTacos, "accepted", "2026-10-20"),
        applied(V.tidepool, "accepted", "2026-10-21"),
        applied(V.saltSmoke, "accepted", "2026-10-22"),
        applied(V.oakBarrel, "accepted", "2026-10-23"),
        applied(V.sweetBay, "accepted", "2026-10-27"),
        applied(V.lupine, "accepted", "2026-10-28"),
        applied(V.honeycombCrepes, "declined", "2026-10-30"),
        applied(V.threeRocks, "accepted", "2026-11-02"),
        applied(V.gardenGyro, "new", "2026-11-05"),
        applied(V.pasoPretzel, "new", "2026-11-08"),
        applied(V.pierBoba, "new", "2026-11-09"),
        applied(V.sagebrush, "new", "2026-11-10"),
        applied(V.morningFog, "new", "2026-11-11"),
        applied(V.cypress, "new", "2026-11-12"),
      ],
      pastVendorListYear: 2026,
      ratings: { reports: 6, audienceFit: 3.8, organization: 3.5 },
      returningVendorRate: 0.41,
      fitRanges: [
        { vendorType: "Cold drinks", low: 44, high: 70 },
        { vendorType: "Hot food and drinks", low: 41, high: 66 },
      ],
      countyMedianFeePerAttendee: 0.05,
      activity: { views: 640, saves: 38, applyClicks: 15 },
    },
  ],
  messages: [
    {
      id: "host-message-1",
      eventId: "host-sample-1",
      vendor: V.coastline[0],
      sentOn: "2026-11-14",
      body: "Is power included in the booth fee, or is the $35 electricity fee separate? We run one small fridge.",
      unread: true,
    },
    {
      id: "host-message-2",
      eventId: "host-sample-1",
      vendor: V.masaMadre[0],
      sentOn: "2026-11-14",
      body: "Can we load in before 3 PM? Our steamers take about an hour to heat up.",
      unread: true,
    },
    {
      id: "host-message-3",
      eventId: "host-sample-2",
      vendor: V.duneDumplings[0],
      sentOn: "2026-11-13",
      body: "We applied last week. Do you know when the first round of decisions goes out?",
      unread: true,
    },
    {
      id: "host-message-4",
      eventId: "host-sample-1",
      vendor: V.kettleCorn[0],
      sentOn: "2026-11-12",
      body: "Deposit sent. Thanks for the quick reply.",
      unread: false,
    },
    {
      id: "host-message-5",
      eventId: "host-sample-3",
      vendor: V.tidepool[0],
      sentOn: "2026-11-10",
      body: "Are corner booths still available at the higher fee?",
      unread: false,
    },
  ],
};
