# Organizer dashboard (`/host/dashboard`): design

Date: 2026-11-14. Branch: `feat/host-dashboard`. Approved by Duke in chat on Nov 14.

## Why

Boothfinder is dual-sided (MASTER.md §2 feature 7, pending merge). Organizers supply the
facts that make vendor Fit scores accurate: attendance, its source, fees, past vendor
lists. The dashboard is the organizer's home after login and shows them why filling in
those facts helps them. That is the "data flywheel" point in the pitch.

## What it shows

Organizer level:

- **Your events**: one row per event with the application pipeline (new, accepted,
  waitlisted, declined), booths filled out of total, and days until the application
  deadline. Clicking a row selects it.
- **Inbox**: messages from vendors across all events.
- **Create event**: links to the extractor page (`/extract`).

For the selected event:

- **Vendor mix**: accepted vendors per category next to the organizer's limit, plus what
  one more vendor in a full category does to each vendor's expected sales, from the
  formula in MASTER.md §4 (`E[S] = A × p × T / (1 + N)`).
- **How vendors see your event**: Fit score ranges for common vendor types, average
  ratings and returning-vendor rate as totals only, and fee per attendee next to the
  county median.
- **Listing completeness**: attendance, attendance source, electricity fee, booth size,
  past vendor list. Missing attendance means vendors see "Estimated" scores.
- **Listing activity**: views, saves, Apply clicks.
- **Actions**: message accepted vendors (a compose box; nothing is sent), export the
  applicant list (a real CSV download).

## Goals, non-goals, anti-goals

- Goals: looks like the live vendor dashboard; every made-up number is labelled; the
  calculations are pure functions with tests.
- Non-goals: accounts, storing applications or messages, database changes, computing
  Fit scores (that is the Fit score card).
- Anti-goals: a generic template dashboard look (gradient stat tiles, a colour per
  badge, charts for decoration); sample data shown without a label.

## Constraints

- MASTER.md §6: new files only, no edits to shared or protected files, no new packages.
- `app/host/page.tsx` is being rewritten on `feat/organizer-assistant`, so this card does
  not touch it.
- Next.js 16 Cache Components: today's date is read on the server after
  `await connection()`, inside `<Suspense>` (README, "Loading data in pages").

## Approaches

1. **Hardcoded sample module plus pure calculations (picked).** No migration, no risk to
   the live database, and the event part of the data is a real `EventRow`, so real rows
   can replace the samples later.
2. New tables for applications, messages and listing activity, seeded with `is_sample`
   rows. Closest to the real thing, but needs migrations, organizer ownership and access
   rules before accounts exist.
3. Extend the assistant page at `/host`. One organizer page, but it edits a file that is
   in flight on another branch and mixes two cards.

## Decisions

- **Address:** `/host/dashboard`, with its own layout. Nothing links to it yet: the login
  card sends organizers here.
- **Look:** the vendor dashboard's shell and styles, copied into `components/host/` so no
  vendor file changes. Light surface, Figtree, emerald-700 accent, neutral hairlines,
  amber only for Sample labels and warnings, lucide icons at stroke 1.75.
- **Data:** one sample organizer with three sample events in `lib/host/sampleData.ts`.
  The first mirrors the sample festival on `feat/organizer-assistant` so both organizer
  pages tell one story.

| Shown | Source |
| --- | --- |
| Pipeline counts, booths filled, vendor mix | Calculated from the sample applicant list |
| Days until deadline | Calculated from the event's deadline and today's date |
| Crowding effect | Calculated from MASTER.md §4 |
| Fee per attendee, completeness checklist | Calculated from the event's own fields |
| County median, ratings, returning-vendor rate, Fit score ranges, activity, inbox | Sample values |

## As built

- Page and shell: `app/host/dashboard/{layout,page}.tsx`, `components/host/*`.
- Numbers: `lib/host/metrics.ts`. Wording for every state (closed deadline, missing
  attendance, full category): `lib/host/labels.ts`. Export: `lib/host/exportCsv.ts`.
  Sample account: `lib/host/sampleData.ts`.
- Tests: `node --test "lib/host/*.test.mjs"` (71 tests, Node's built-in runner, no packages).
  The components have no automated tests; their logic lives in the tested files above and
  the markup was checked in a browser at 1440, 1100 and 375 wide.
- The layout differs from the first sketch in one way: the events list is full width, and
  the inbox sits beside the selected event's panels.
- The demo sign-in (`lib/auth/roles.ts`, merged after this design) still sends hosts to
  `/host`. Pointing it at `/host/dashboard` is a one-line change, left for the team to decide.

## Follow-ups (not in this card)

- Login sends organizers to `/host/dashboard`.
- After `feat/organizer-assistant` merges: make `/host` open the dashboard, move the
  assistant into the sidebar, and read the sample festival from one file.
- Merge the vendor and host shells into one shared component.
- Replace the sample Fit score ranges once the scoring functions exist.
