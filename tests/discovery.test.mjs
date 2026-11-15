// Run with `npm test` (Node 22.18+ runs the TypeScript sources directly).
import assert from "node:assert/strict";
import { test } from "node:test";

import { htmlToText } from "../lib/extractor/htmlText.ts";
import { focusText, shareBudget } from "../lib/extractor/focus.ts";
import { projectEvent } from "../lib/scoring/projection.ts";
import { isAllowedByRobots } from "../lib/extractor/robots.ts";
import { dayTypeFor, numbersIn, quoteInText, verifyExtraction } from "../lib/extractor/verify.ts";
import { californiaVerdict, insideCalifornia } from "../lib/discovery/location.ts";
import {
  CA_COUNTIES,
  OPPORTUNITY_KINDS,
  QUERY_COUNT,
  canonicalUrl,
  hostMatches,
  queryAt,
  seasonYear,
} from "../lib/discovery/queries.ts";

// A made-up page, used only as a test fixture. It is not event data.
const PAGE = {
  url: "https://example.org/vendors",
  links: ["https://example.org/files/vendor-app.pdf", "https://example.org/contact"],
  text: `2027 Example Harvest Festival
Vendor Applications Now Open
Saturday, October 9 and Sunday, October 10, 2027 at Example Park, 100 Main Street, Exampleville, CA
Food vendor booth (10x10): $350 for the weekend. Non-food booths are $1,250.50.
Electricity is an additional $40.
Applications are due August 1, 2027. A $25 non-refundable jury fee applies.
The festival keeps 10% of gross food sales.
Last year more than 12,000 people attended.`,
};
const PDF = {
  url: "https://example.org/files/vendor-app.pdf",
  links: [],
  text: "Vendor Application\nBooth  space  is limited to\n60 vendors. Only two vendors per beverage category.",
};
const field = (value, quote, doc = 1) => ({ value, quote, doc });

test("keeps facts whose quotes are in the source", () => {
  const out = verifyExtraction(
    {
      is_vendor_opportunity: true,
      fields: {
        name: field("Example Harvest Festival", "2027 Example Harvest Festival"),
        event_type: { value: "festival" },
        city: field("Exampleville", "at Example Park, 100 Main Street, Exampleville, CA"),
        venue: field("Example Park", "at Example Park, 100 Main Street, Exampleville, CA"),
        start_date: field("2027-10-09", "Saturday, October 9 and Sunday, October 10, 2027"),
        end_date: field("2027-10-10", "Saturday, October 9 and Sunday, October 10, 2027"),
        application_deadline: field("2027-08-01", "Applications are due August 1, 2027."),
        booth_fee_min: field(350, "Food vendor booth (10x10): $350 for the weekend."),
        booth_fee_max: field(1250.5, "Non-food booths are $1,250.50."),
        electricity_fee: field(40, "Electricity is an additional $40."),
        application_fee: field(25, "A $25 non-refundable jury fee applies."),
        fee_pct_of_sales: field(10, "The festival keeps 10% of gross food sales."),
        expected_attendance: field(12000, "Last year more than 12,000 people attended."),
        vendor_spots: field(60, "Booth space is limited to 60 vendors.", 2),
        similar_vendor_limit: field("Two vendors per beverage category", "Only two vendors per beverage category.", 2),
        apply_url: { value: "https://example.org/files/vendor-app.pdf" },
      },
    },
    [PAGE, PDF],
  );
  assert.deepEqual(out.dropped, []);
  assert.equal(out.event.name, "Example Harvest Festival");
  assert.equal(out.event.event_type, "festival");
  assert.equal(out.event.booth_fee_min, 350);
  assert.equal(out.event.booth_fee_max, 1250.5);
  assert.equal(out.event.fee_pct_of_sales, 10);
  assert.equal(out.event.expected_attendance, 12000);
  assert.equal(out.event.vendor_spots, 60);
  assert.equal(out.event.day_type, "weekend");
  assert.equal(out.event.apply_url, PDF.url);
  assert.equal(out.event.source_url, PAGE.url);
  assert.equal(out.evidence.vendor_spots.url, PDF.url); // quote wrapped across lines in the PDF
  assert.equal(out.hasPricing, true);
});

test("drops anything the source doesn't back up", () => {
  const out = verifyExtraction(
    {
      fields: {
        name: field("Example Harvest Festival", "2027 Example Harvest Festival"),
        // Quote isn't on the page.
        booth_fee_min: field(200, "Booths are $200 each."),
        // Quote is real, but the figure isn't in it.
        electricity_fee: field(75, "Electricity is an additional $40."),
        // Real quote, wrong day.
        application_deadline: field("2027-08-15", "Applications are due August 1, 2027."),
        // Real quote, wrong year.
        start_date: field("2028-10-09", "Saturday, October 9 and Sunday, October 10, 2027"),
        // Value's words aren't in the quote.
        city: field("Springfield", "at Example Park, 100 Main Street, Exampleville, CA"),
        // No quote at all.
        expected_attendance: { value: 50000 },
        // A link that isn't in any document.
        apply_url: { value: "https://evil.example/apply" },
        event_type: { value: "carnival" },
      },
    },
    [PAGE, PDF],
  );
  assert.deepEqual(out.dropped.sort(), [
    "application_deadline", "apply_url", "booth_fee_min", "city",
    "electricity_fee", "expected_attendance", "start_date",
  ]);
  assert.equal(out.event.booth_fee_min, null);
  assert.equal(out.event.booth_fee_max, null);
  assert.equal(out.event.city, null);
  assert.equal(out.event.apply_url, null);
  assert.equal(out.event.event_type, "other");
  assert.equal(out.event.day_type, null);
  assert.equal(out.hasPricing, false);
});

test("an unverified name makes the candidate unusable", () => {
  const out = verifyExtraction({ fields: { name: field("Totally Different Fair", "Totally Different Fair") } }, [PAGE]);
  assert.equal(out.event, null);
});

test("a single fee fills both ends; a zero fee needs the source to say free", () => {
  const one = verifyExtraction(
    { fields: { name: field("Example Harvest Festival", "2027 Example Harvest Festival"), booth_fee_max: field(350, "Food vendor booth (10x10): $350 for the weekend.") } },
    [PAGE],
  );
  assert.equal(one.event.booth_fee_min, 350);
  assert.equal(one.evidence.booth_fee_min.quote, one.evidence.booth_fee_max.quote);

  const zero = verifyExtraction(
    { fields: { name: field("Example Harvest Festival", "2027 Example Harvest Festival"), booth_fee_min: field(0, "Electricity is an additional $40.") } },
    [PAGE],
  );
  assert.equal(zero.event.booth_fee_min, null);
});

test("survives malformed model output", () => {
  for (const raw of [{}, { fields: null }, { fields: { name: null, city: "x", booth_fee_min: { value: "abc", quote: 5 } } }]) {
    assert.equal(verifyExtraction(raw, [PAGE]).event, null);
  }
});

test("text helpers", () => {
  assert.deepEqual(numbersIn("$1,250.50 or 10k, 2 million"), [1250.5, 10000, 2000000]);
  assert.equal(quoteInText("“Vendor   applications now OPEN”", PAGE.text), true);
  assert.equal(quoteInText("$40", PAGE.text), false); // too short to prove anything
  assert.equal(dayTypeFor("2027-10-09", "2027-10-10"), "weekend");
  assert.equal(dayTypeFor("2027-10-06", null), "weekday");
  assert.equal(dayTypeFor("2027-10-08", "2027-10-10"), "mixed");
  assert.equal(dayTypeFor(null, null), null);
});

test("htmlToText keeps text and links, drops scripts", () => {
  const { title, text, links } = htmlToText(
    `<html><head><title>Vendors &amp; Exhibitors</title><style>p{}</style></head><body>
     <script>var fee = "$999";</script><nav><a href="/vendors">Vendors</a> Tickets&nbsp</nav><h1>Booth fees</h1><p>10&#215;10 space: &#36;150&nbsp;per day</p>
     <table><tr><td>Food</td><td>$300</td></tr></table>
     <a href="/apply.pdf">Vendor <b>application</b></a></body></html>`,
  );
  assert.equal(title, "Vendors & Exhibitors");
  assert.match(text, /10×10 space: \$150 per day/);
  assert.match(text, /Food \| \$300/);
  assert.doesNotMatch(text, /999/);
  assert.doesNotMatch(text, /Tickets/); // menu text is dropped, but its links are kept
  assert.deepEqual(links, [
    { href: "/vendors", text: "Vendors" },
    { href: "/apply.pdf", text: "Vendor application" },
  ]);
});

test("robots.txt rules", () => {
  const robots = `User-agent: *\nDisallow: /private/\nAllow: /private/vendors\nDisallow: /*.pdf$\n\nUser-agent: BoothfinderBot\nDisallow: /no-bots/`;
  const ua = "BoothfinderBot/0.1";
  assert.equal(isAllowedByRobots(robots, "/vendors", ua), true);
  assert.equal(isAllowedByRobots(robots, "/no-bots/x", ua), false);
  assert.equal(isAllowedByRobots(robots, "/private/x", ua), true); // our own group replaces *
  assert.equal(isAllowedByRobots(robots, "/private/x", "OtherBot"), false);
  assert.equal(isAllowedByRobots(robots, "/private/vendors", "OtherBot"), true);
  assert.equal(isAllowedByRobots(robots, "/files/app.pdf", "OtherBot"), false);
  assert.equal(isAllowedByRobots("", "/anything", ua), true);
});

test("queries cover every county and kind once per cycle", () => {
  assert.equal(CA_COUNTIES.length, 58);
  assert.equal(new Set(CA_COUNTIES).size, 58);
  assert.equal(QUERY_COUNT, 58 * OPPORTUNITY_KINDS.length);
  const all = new Set(Array.from({ length: QUERY_COUNT }, (_, i) => queryAt(i, 2027)));
  assert.equal(all.size, QUERY_COUNT);
  assert.equal(queryAt(QUERY_COUNT, 2027), queryAt(0, 2027));
  assert.match(queryAt(0, 2027), /^San Luis Obispo County, California 2027 county fair /);
  assert.equal(seasonYear(new Date("2026-11-14T00:00:00Z")), 2027);
  assert.equal(seasonYear(new Date("2027-03-01T00:00:00Z")), 2027);
});

test("url helpers", () => {
  assert.equal(canonicalUrl("https://a.org/v?utm_source=x&year=2027&fbclid=1#top"), "https://a.org/v?year=2027");
  assert.equal(canonicalUrl("mailto:a@b.org"), null);
  assert.equal(hostMatches("www.facebook.com", "facebook.com"), true);
  assert.equal(hostMatches("notfacebook.com", "facebook.com"), false);
});

test("long documents are trimmed to their relevant lines, in order", () => {
  const filler = Array.from({ length: 300 }, (_, i) => `Paragraph ${i} about the history of the grounds and parking.`);
  const doc = ["2027 Example Fair Vendor Handbook", ...filler.slice(0, 150), "Booth fees", "Food vendor 10x10 space: $450 per weekend", "Deposit due March 1", ...filler.slice(150)].join("\n");
  const out = focusText(doc, 2000);
  assert.ok(out.length <= 2100);
  assert.match(out, /^2027 Example Fair Vendor Handbook/);
  assert.match(out, /Booth fees\nFood vendor 10x10 space: \$450 per weekend\nDeposit due March 1/);
  assert.match(out, /\[…\]/);
  assert.equal(focusText("short text", 2000), "short text");
});

test("prompt budget is shared: short documents keep everything", () => {
  assert.deepEqual(shareBudget([1000, 50000, 50000], 18000), [1000, 8500, 8500]);
  assert.deepEqual(shareBudget([500, 700], 18000), [500, 700]);
  assert.deepEqual(shareBudget([40000], 18000), [18000]);
});

test("a verified discovery is a usable input for the projection engine", () => {
  const { event } = verifyExtraction(
    {
      fields: {
        name: field("Example Harvest Festival", "2027 Example Harvest Festival"),
        start_date: field("2027-10-09", "Saturday, October 9 and Sunday, October 10, 2027"),
        end_date: field("2027-10-10", "Saturday, October 9 and Sunday, October 10, 2027"),
        booth_fee_min: field(350, "Food vendor booth (10x10): $350 for the weekend."),
        expected_attendance: field(12000, "Last year more than 12,000 people attended."),
        electricity_fee: field(40, "Electricity is an additional $40."),
      },
    },
    [PAGE],
  );
  // What approval writes to the events table, plus the id the database assigns.
  const row = { id: "test", fee_info_year: null, ...event };
  const brand = { price: 8, margin: 0.6, purchaseRate: 0.04, otherCosts: 100, productType: "cold" };
  const projection = projectEvent(row, brand);
  assert.equal(projection.days, 2);
  assert.equal(projection.scenarios.base.organizerFee, 350);
  assert.ok(projection.scenarios.base.grossRevenue > 0);
  assert.ok(Number.isFinite(projection.scenarios.base.profit ?? projection.scenarios.base.grossRevenue));
});

test("a refundable deposit is not a booth fee; a vendor's share implies the organizer's", () => {
  const doc = {
    url: "https://example.org/food",
    links: [],
    text: "Example Jazz Festival food vendors\nA $500 Reservation Fee will be required, this fee will be refunded to you after the festival.\nEach vendor will be paid 70% of Net sales.\nHeld in Monterey County.",
  };
  const out = verifyExtraction(
    {
      fields: {
        name: field("Example Jazz Festival", "Example Jazz Festival food vendors"),
        event_type: "festival", // bare value, as some models return it
        county: field("Monterey County", "Held in Monterey County."),
        booth_fee_min: field(500, "A $500 Reservation Fee will be required, this fee will be refunded to you after the festival."),
        fee_pct_of_sales: field(30, "Each vendor will be paid 70% of Net sales."),
      },
    },
    [doc],
  );
  assert.equal(out.event.booth_fee_min, null);
  assert.equal(out.event.booth_fee_max, null);
  assert.equal(out.event.fee_pct_of_sales, 30);
  assert.equal(out.event.event_type, "festival");
  assert.equal(out.event.county, "Monterey");
  assert.deepEqual(out.dropped, ["booth_fee_min"]);
  assert.equal(out.hasPricing, true);
});

test("California only: the source must tie the event's own place to California", () => {
  const verdict = (city, county, text, host = "example.org") =>
    californiaVerdict({ city, county, texts: [text], host }).verdict;

  // Proven.
  assert.equal(verdict("Monterey", null, "Fairgrounds, 2004 Fairground Rd, Monterey, CA 93940"), "yes");
  assert.equal(verdict("Paso Robles", null, "Held every June in Paso Robles, California."), "yes");
  assert.equal(verdict("paso robles", null, "PASO ROBLES, CA"), "yes");
  assert.equal(verdict(null, "Kern County", "A desert festival in Kern County, California."), "yes");
  assert.equal(verdict("Goleta", null, "Vendor permits for events in Goleta.", "www.cityofgoleta.ca.gov"), "yes");

  // Another state: the case that got through before (the geocoder found a Belleville in California).
  assert.equal(verdict("Belleville", null, "Belleville Farmers Market, 20 S Main St, Belleville, IL 62220"), "no");
  assert.equal(verdict("Portland", null, "Saturdays in downtown Portland, Oregon."), "no");
  assert.equal(verdict("Reno", null, "Reno, NV. Our sister market is in Truckee, CA 96161."), "no");
  assert.equal(verdict("Springfield", null, "Vendors welcome. Mail forms to PO Box 9, Dayton, OH 45402."), "no");

  // Canada: the real Belleville Farmers Market is in Ontario, on a ".ca" address.
  assert.equal(verdict("Belleville", null, "City of Belleville Stall Fee: $200.00 per stall", "bellevillefarmersmarket.ca"), "no");
  assert.equal(verdict("Belleville", null, "169 Front Street, Belleville, Ontario K8N 2Z2"), "no");
  assert.equal(verdict("Ontario", null, "Ontario Convention Center, Ontario, CA 91764"), "yes"); // the California city

  // The word "California" somewhere on the page proves nothing.
  assert.equal(verdict("Belleville", null, "Belleville Farmers Market on California Avenue. Produce from California."), "unstated");
  assert.equal(verdict("Salem", null, "Join us in Salem or nearby towns."), "unstated");
  assert.equal(verdict(null, null, "Vendors wanted in California!"), "unstated");
  assert.equal(verdict("Ojai", null, "Sundays at the old depot in Ojai."), "unstated");

  assert.equal(insideCalifornia(36.6, -121.89), true); // Monterey
  assert.equal(insideCalifornia(38.52, -89.98), false); // Belleville, Illinois
});

test("an application covering several events: named for its organizer, with reasons for anything dropped", () => {
  const doc = {
    url: "https://example.org/apply",
    links: [],
    text: "2027 Food Vendor Opportunities\nThe Example Community Council reserves the right to accept or deny applications.\nParticipating Food Vendors will be charged a fee equivalent to 15% of their gross product sales for the events listed below*.\nKids Day - Saturday April 24, 2027, 11am-3pm @ Hagan Park\n*Not including the 4th of July.",
  };
  const out = verifyExtraction(
    {
      fields: {
        organizer_name: field("Example Community Council", "The Example Community Council reserves the right to accept or deny applications."),
        // Words from the title quote plus the verified organizer.
        name: field("Example Community Council Food Vendor Opportunities", "2027 Food Vendor Opportunities"),
        start_date: field("2027-04-24", "Kids Day - Saturday April 24, 2027, 11am-3pm @ Hagan Park"),
        fee_pct_of_sales: field(15, "Participating Food Vendors will be charged a fee equivalent to 15% of their gross product sales for the events listed below*."),
        // Not on the page.
        booth_fee_min: field(250, "Booth fee is $250."),
        // Real quote, but it doesn't say 20.
        application_fee: field(20, "Kids Day - Saturday April 24, 2027, 11am-3pm @ Hagan Park"),
      },
    },
    [doc],
  );
  assert.equal(out.event.name, "Example Community Council Food Vendor Opportunities");
  assert.equal(out.event.fee_pct_of_sales, 15);
  assert.equal(out.event.start_date, "2027-04-24");
  assert.equal(out.event.end_date, null);
  assert.deepEqual(out.dropped.sort(), ["application_fee", "booth_fee_min"]);
  assert.equal(out.droppedDetail.booth_fee_min.claimed, "250");
  assert.match(out.droppedDetail.booth_fee_min.reason, /aren't in the source/);
  assert.match(out.droppedDetail.application_fee.reason, /doesn't state this value/);
});

test("a name can't borrow words from anywhere but its quote and the organizer", () => {
  const out = verifyExtraction(
    { fields: { name: field("Grand Example Harvest Festival", "2027 Example Harvest Festival") } },
    [PAGE],
  );
  assert.equal(out.event, null);
});
