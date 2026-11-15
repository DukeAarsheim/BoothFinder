# Organizer Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An organizer dashboard at `/host/dashboard` that shows the organizer's events with their application pipeline, an inbox, and four panels plus two actions for the selected event.

**Architecture:** A hardcoded, labelled sample account (`lib/host/sampleData.ts`) feeds pure calculation functions (`lib/host/metrics.ts`, `lib/host/exportCsv.ts`). A server page reads today's date after `await connection()` and hands the account to one client component that owns the selected event. The shell copies the vendor dashboard's shell so both sides look the same.

**Tech Stack:** Next.js 16.4 (App Router, Cache Components), React 19, Tailwind CSS 4, lucide-react, Node's built-in test runner (`node --test`, no new packages).

**Spec:** `docs/superpowers/specs/2026-11-14-host-dashboard-design.md`

## Global Constraints

- New files only. No edits to `app/host/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/vendor/*`, `components/ui/*`, `lib/types.ts`, `package.json`, `MASTER.md`.
- No new packages. No database changes.
- Every made-up value is labelled: a "Sample" banner at the top of the page, `SampleTag` on the organizer, each event name and the inbox, and a `Sample` column in the export.
- Styles come from the vendor dashboard: white surface, `uiFont` (Figtree), `text-neutral-950/600/500`, hairlines `border-neutral-200`, accent `emerald-700`, amber only for Sample labels and warnings, lucide icons at `strokeWidth={1.75}`, focus ring `focus-visible:outline-2 focus-visible:outline-emerald-700`, pills `rounded-full h-11`, lists `divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200`.
- Modules that the tests import (`metrics.ts`, `exportCsv.ts`, `sampleData.ts`) use `import type` only, so Node can load them without the `@/` alias.
- Tests run with `node --test "lib/host/*.test.mjs"`.
- UI copy: sentence case, no exclamation marks, no "successfully". Sidebar labels use Title Case to match the vendor sidebar.

## Review Focus

1. An event with no deadline, or one that has passed: the row shows a dash with "no deadline set", or "Closed", never a negative number or `NaN`.
2. A category with a limit of 0, or more accepted vendors than the limit: open spots never go negative and the row is not called full when the limit is 0.
3. Missing or zero attendance: fee per attendee is "not available", never `Infinity` or `NaN`.
4. Vendor names with commas, quotes, line breaks or a leading `=`: the export keeps its columns and nothing runs as a spreadsheet formula.
5. No events, no applicants, or no messages: an empty state, not a crash or a `0 / 0` bar.

---

### Task 1: Types and calculations

**Files:**
- Create: `lib/host/types.ts`, `lib/host/metrics.ts`
- Test: `lib/host/metrics.test.mjs`

**Interfaces:**
- Produces (`types.ts`): `ApplicantStatus = "new" | "accepted" | "waitlisted" | "declined"`; `Applicant { vendor, category: VendorCategory, product, status, appliedOn }`; `FitRange { vendorType, low, high }`; `RatingTotals { reports, audienceFit, organization }`; `ListingActivity { views, saves, applyClicks }`; `HostEvent { event: EventRow, limits: Record<VendorCategory, number>, applicants, pastVendorListYear: number | null, ratings: RatingTotals | null, returningVendorRate: number | null, fitRanges, countyMedianFeePerAttendee: number | null, activity }`; `HostMessage { id, eventId, vendor, sentOn, body, unread }`; `HostAccount { isSample: true, organizer, events, messages }`.
- Produces (`metrics.ts`):
  - `pipelineCounts(applicants: Applicant[]): Record<ApplicantStatus, number>`
  - `daysUntil(deadline: string | null, today: string): number | null`
  - `vendorMix(hostEvent: HostEvent): MixRow[]` with `MixRow { category, accepted, limit, open, full }`
  - `boothsFilled(hostEvent: HostEvent): { filled: number; total: number }`
  - `crowdingDrop(similarAccepted: number): number | null`
  - `feePerAttendee(event: Pick<EventRow, "booth_fee_min" | "booth_fee_max" | "expected_attendance">): number | null`
  - `listingChecklist(hostEvent: HostEvent): ChecklistItem[]` with `ChecklistItem { key, label, done }`
  - `applyRate(activity: ListingActivity): number | null`

- [ ] **Step 1: Write the failing tests** in `lib/host/metrics.test.mjs`:
  - `pipelineCounts`: 2 new, 1 accepted, 1 declined gives `{ new: 2, accepted: 1, waitlisted: 0, declined: 1 }`; `[]` gives all zeros.
  - `daysUntil`: `("2026-11-23", "2026-11-14")` is `9`; same day is `0`; `("2026-11-10", "2026-11-14")` is `-4`; `(null, …)` is `null`; `("2027-03-01", "2027-02-28")` is `1`.
  - `vendorMix`: limits `{ food: 10, drink: 4, other: 0 }` with 9 food and 4 drink accepted gives food `{ accepted: 9, limit: 10, open: 1, full: false }`, drink `{ open: 0, full: true }`, and no `other` row; 5 accepted against a limit of 4 gives `open: 0, full: true`; 1 accepted against a limit of 0 gives a row with `open: 0, full: false`.
  - `boothsFilled`: counts only accepted applicants; total is the sum of the limits; no limits and no applicants gives `{ filled: 0, total: 0 }`.
  - `crowdingDrop`: `(3)` is `0.25`, `(4)` is `0.2`, `(1)` is `0.5`, `(0)` is `null`.
  - `feePerAttendee`: `350 / 12000`; uses `booth_fee_min` when both fees are set; falls back to `booth_fee_max`; `null` for missing fee, missing attendance, and attendance `0`.
  - `listingChecklist`: five items in the order attendance, attendance source, electricity fee, booth size, past vendor list; an electricity fee of `0` counts as done; `null` and empty strings count as missing.
  - `applyRate`: `47 / 1480`; `null` when views are `0`.
- [ ] **Step 2: Run** `node --test "lib/host/*.test.mjs"`. Expected: fails because `metrics.ts` does not exist.
- [ ] **Step 3: Implement** `types.ts` and `metrics.ts`. `daysUntil` compares the two dates as UTC midnights. `crowdingDrop(k)` is `1 / (k + 1)`: with `k` similar vendors each has `N = k − 1` rivals, so MASTER.md §4's `E[S] = A × p × T / (1 + N)` scales with `1 / k`.
- [ ] **Step 4: Run** the tests. Expected: all pass.

### Task 2: Applicant export

**Files:**
- Create: `lib/host/exportCsv.ts`
- Test: `lib/host/exportCsv.test.mjs`

**Interfaces:**
- Consumes: `HostEvent` from Task 1.
- Produces: `applicantsCsv(hostEvent: HostEvent): string`; `csvFileName(eventName: string): string`.

- [ ] **Step 1: Write the failing tests**: header row is `Event,Vendor,Category,Product,Status,Applied,Sample`; rows end with `\r\n`; a name containing a comma or a quote is quoted with quotes doubled; a cell starting with `=`, `+`, `-` or `@` gets a leading `'`; the `Sample` column is `yes` when `event.is_sample`; no applicants gives the header only; `csvFileName("Harvest on the Plaza")` is `harvest-on-the-plaza-applicants.csv` and `csvFileName("  ")` is `event-applicants.csv`.
- [ ] **Step 2: Run** the tests. Expected: fail, module missing.
- [ ] **Step 3: Implement** both functions.
- [ ] **Step 4: Run** the tests. Expected: pass.

### Task 3: Sample account

**Files:**
- Create: `lib/host/sampleData.ts`
- Test: `lib/host/sampleData.test.mjs`

**Interfaces:**
- Produces: `SAMPLE_HOST: HostAccount`. Organizer `Plaza Events Co.`. Events, all `is_sample: true`:
  - `host-sample-1` Holiday Night Market: market, 2026-12-12, Downtown park, Paso Robles, San Luis Obispo County, deadline 2026-11-23, fee $180, application fee $20, electricity $35, 10x10, attendance 6,500 from "2025 gate count", limits food 10 / drink 4 / other 10, 29 applicants (19 accepted: 9 food, 4 drink, 6 other; 5 new; 3 waitlisted; 2 declined), vendor list 2025, 14 reports (audience fit 4.3, organization 4.6), returning 62%, county median $0.04, activity 1,480 / 112 / 47.
  - `host-sample-2` Harvest on the Plaza (mirrors `lib/organizers/demoFestival.ts` on `feat/organizer-assistant`): festival, 2027-09-18 to 2027-09-19, Outdoor downtown plaza, San Luis Obispo, deadline 2027-07-01, fee $350, application fee $25, electricity $50, 10x10, attendance 12,000 with no source, limits food 12 / drink 4 / other 0, 10 applicants (5 accepted: 3 food, 2 drink; 4 new; 1 declined), no vendor list, no reports, county median $0.04, activity 1,240 / 86 / 41.
  - `host-sample-3` Spring Street Fair: street fair, 2027-05-01 to 2027-05-02, Main Street, Santa Maria, Santa Barbara County, deadline 2027-03-01, fee $225 to $400, no electricity fee, 10x10 or 10x20, no attendance, limits food 8 / drink 3 / other 9, 14 applicants (7 accepted: 3 food, 1 drink, 3 other; 6 new; 1 declined), vendor list 2026, 6 reports (3.8, 3.5), returning 41%, county median $0.05, activity 640 / 38 / 15.
  - Five messages, three unread.

- [ ] **Step 1: Write the failing tests**: event ids are unique; every event and the account are flagged sample; every message's `eventId` is a real event; accepted vendors never exceed a category's limit; no vendor applies twice to one event; the counts above hold for each event.
- [ ] **Step 2: Run** the tests. Expected: fail, module missing.
- [ ] **Step 3: Write** the data.
- [ ] **Step 4: Run** the tests. Expected: pass.

### Task 4: Shell and route

**Files:**
- Create: `lib/host/nav.ts`, `components/host/HostShell.tsx`, `components/host/HostSidebar.tsx`, `app/host/dashboard/layout.tsx`

**Interfaces:**
- Produces: `HOST_NAV` (Dashboard at `/host/dashboard`, Create Event at `/extract`); `HostShell({ children, className })`, marked `data-host-shell`; the layout hides the site header with `body:has([data-host-shell]) > header { display: none; }`, the same way `app/vendor/layout.tsx` does.

- [ ] **Step 1: Build** the two components as copies of `VendorShell` and `VendorSidebar` with the same classes, reading `HOST_NAV`. "Switch role" links to `/start`.
- [ ] **Step 2: Verify** with `npm run lint`. Expected: exit 0.

### Task 5: Dashboard page and panels

**Files:**
- Create: `components/host/Panel.tsx`, `components/host/EventsList.tsx`, `components/host/Inbox.tsx`, `components/host/EventPanels.tsx`, `components/host/EventActions.tsx`, `components/host/HostDashboard.tsx`, `app/host/dashboard/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1 to 4; `SampleTag` and `VendorNotice` from `components/vendor/VendorNotice`; `dateParts`, `formatDateRange`, `formatDate`, `formatBoothFee`, `EVENT_TYPE_LABELS` from `lib/vendor/format`.
- Produces: `HostDashboard({ account, today })`, a client component. The page renders it inside `<Suspense>` from an async component that calls `await connection()` and passes today's date in `America/Los_Angeles` as `YYYY-MM-DD`.

- [ ] **Step 1: Build** the page in this order, top to bottom: title row with "Create event from PDF" (the one filled button); Sample banner; "Your events" (two thirds) beside "Inbox" (one third); the selected event's name with "Message accepted vendors" and "Export applicants"; a two-by-two grid of Vendor mix, How vendors see your event, Listing completeness, Listing activity.
- [ ] **Step 2: Cover the Review Focus cases** in the components: "Closed" and "No deadline" in the events list; "Not available" for fee per attendee; empty states for no events, no applicants and no messages; no bar when the total is 0.
- [ ] **Step 3: Verify** with `npm run lint` and `npm run build`. Expected: both exit 0 and `/host/dashboard` is listed as a partial prerender.

### Task 6: Compare with the live site and check in a browser

- [ ] **Step 1:** Open `/host/dashboard` and `/vendor/saved` side by side at 1440 wide. The sidebar, title, list rows, pills and tags match in size, weight, colour and spacing.
- [ ] **Step 2:** Check 375 wide: no sideways scroll, the drawer opens, rows wrap cleanly.
- [ ] **Step 3:** Click through: selecting each event updates the four panels; a message expands and loses its unread dot; the export downloads a CSV; the message box refuses an empty message and says nothing was sent.
- [ ] **Step 4:** No console errors. Run all tests, lint and build one last time.
