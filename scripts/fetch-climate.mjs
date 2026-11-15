// One-time script: builds data/climate/monthly-highs.json, the typical daily high
// (°C) for each calendar month at the places our events are held.
//
// Source: Open-Meteo Historical Weather API (reanalysis data; CC BY 4.0, credited
// in MASTER.md §9). Only public venue coordinates are sent. Nothing is fetched
// when the app runs: the app reads the saved file.
//
// Run: node scripts/fetch-climate.mjs
// Re-run it (and commit the file) after adding events in a new part of California.
import { writeFileSync, mkdirSync } from "node:fs";

// Rounded venue coordinates of the events in the database (Nov 15 2026).
const POINTS = [
  [32.7, -117.2], [33.0, -117.3], [33.1, -117.3], [33.7, -117.9], [33.7, -116.2],
  [33.8, -116.5], [34.1, -118.2], [34.2, -118.2], [34.3, -119.3], [34.4, -119.7],
  [34.6, -120.1], [35.4, -119.0], [35.5, -120.7], [35.6, -120.7], [36.2, -121.4],
  [36.2, -121.1], [36.9, -121.4], [37.0, -121.6], [37.1, -120.3], [37.3, -121.9],
  [37.5, -120.8], [38.0, -122.5], [38.5, -121.7], [38.5, -120.8], [38.6, -121.5],
  [38.6, -121.3], [38.9, -120.0], [39.9, -120.9],
];
const START = "2015-01-01";
const END = "2024-12-31";
const BATCH = 4;

const out = [];
for (let i = 0; i < POINTS.length; i += BATCH) {
  const group = POINTS.slice(i, i + BATCH);
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${group.map((p) => p[0]).join(",")}` +
    `&longitude=${group.map((p) => p[1]).join(",")}` +
    `&start_date=${START}&end_date=${END}&daily=temperature_2m_max&timezone=America%2FLos_Angeles`;
  let json;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      json = await res.json();
      break;
    }
    if (attempt === 5) throw new Error(`Open-Meteo returned ${res.status}`);
    // The free tier limits requests per minute: wait it out.
    await new Promise((r) => setTimeout(r, 40_000));
  }
  await new Promise((r) => setTimeout(r, 10_000));
  const results = Array.isArray(json) ? json : [json];
  results.forEach((r, k) => {
    const sums = Array(12).fill(0);
    const counts = Array(12).fill(0);
    r.daily.time.forEach((day, d) => {
      const t = r.daily.temperature_2m_max[d];
      if (t == null) return;
      const m = Number(day.slice(5, 7)) - 1;
      sums[m] += t;
      counts[m] += 1;
    });
    out.push({
      lat: group[k][0],
      lng: group[k][1],
      highC: sums.map((s, m) => Math.round((s / counts[m]) * 10) / 10),
    });
  });
  console.log(`fetched ${out.length}/${POINTS.length}`);
}

mkdirSync("data/climate", { recursive: true });
writeFileSync(
  "data/climate/monthly-highs.json",
  JSON.stringify(
    {
      source: "Open-Meteo Historical Weather API (CC BY 4.0)",
      years: `${START.slice(0, 4)}-${END.slice(0, 4)}`,
      unit: "average daily high, °C, for January … December",
      points: out,
    },
    null,
    1,
  ) + "\n",
);
console.log("wrote data/climate/monthly-highs.json");
