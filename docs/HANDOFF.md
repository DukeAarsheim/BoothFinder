# Handoff: where the project stands

For any AI agent or teammate picking this repo up cold. **Read `MASTER.md` first**: it is the source of truth for goals, rules and decisions. This file adds the current state, the commands, and the known gaps, so you don't have to rediscover them.

Written Saturday Nov 14, 2026, evening Pacific. Run `git log --oneline -20` to see anything newer.

## What Boothfinder is

A site for small food and drink brands to find California events that take vendors and see which are worth the booth fee, plus an organizer side where event organizers list events and find vendors. Hackathon demo, live on Vercel from `main`.

## What is built

| Area | Where | Notes |
| --- | --- | --- |
| Landing and role choice | `/`, `/start` | Photo-based landing page (not the 3D hero in MASTER.md §12) |
| Sign-in | `/signin/[role]`, `components/auth`, `lib/auth` | Supabase Auth: email + password and Google. **Required** for every `/vendor/...` and `/host/...` page (`components/auth/RequireSignIn.tsx`). A sign-in is tied to the side it was made on |
| Vendor side | `/vendor`, `/vendor/fit`, `/vendor/saved` | Event map and list (Mapbox, Leaflet fallback), brand numbers and projected profit, saved events. The county filter and map still cover only San Luis Obispo and Santa Barbara |
| Scoring | `lib/scoring/projection.ts` | The projection engine described in MASTER.md §10 |
| Organizer dashboard | `/host/dashboard` | Runs on a labelled **Sample** organizer (`lib/host/sampleData.ts`). Pure calculations in `lib/host/metrics.ts` and `labels.ts` |
| Add event | `/host/dashboard/create` | A form that starts empty. "Upload a file" and "Use a link" fill it in with the AI extractor (`lib/extractor`, `/api/extract`). Saved through `/api/events` |
| Organizer assistant | `/host`, `/api/organizer-assistant`, `lib/organizers` | AI chat about a sample festival |
| Original foundation pages | `/events`, `/extract`, `/rate` | Basic or placeholder; check before relying on them |

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build      # must pass before every pull request
node --test "lib/**/*.test.mjs"   # 109 tests, no packages needed
```

- The tests need **Node 23.6 or newer**: they import `.ts` files directly. Modules they test use `import type` only, because plain Node can't resolve the `@/` alias.
- There is no `test` script in `package.json`.
- `npm run build` and the tests work without any keys. The database, AI and map features need the variables below.

## Environment variables

Names only, from `.env.example`. Values live in `.env.local` (gitignored) and in Vercel. **Never print, paste or commit them.** The repo is public.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, skips all database security), `MAPBOX_TOKEN`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`.

## Database

- Tables: `events`, `event_vendor_lists`, `ratings`. Row-level security is on. The public key can read `events` and `event_vendor_lists` only; everything else goes through server routes using the service-role key (`lib/supabase/admin.ts`, server only).
- Changes are new files in `supabase/migrations/`. Never edit an existing one. The first two files are an earlier draft kept so the files match the applied history.
- **Don't run SQL against the database.** Write the migration and stop; Duke applies it (MASTER.md §5b).
- Bodie's open pull request #14 (vendor-opportunity discovery) adds a migration and new env vars.

## Gotchas

- **Next.js 16 with Cache Components.** Pages that read live data must keep the page component synchronous and put the read in an `async` component inside `<Suspense>`, calling `await connection()` first. See "Loading data in pages" in `README.md` and `app/events/page.tsx`. `export const dynamic = "force-dynamic"` does not work here. The docs for the installed version are in `node_modules/next/dist/docs/`.
- **The look is two themes.** The root is dark; the vendor and organizer dashboards, landing and sign-in pages are light and set their colors explicitly. Match the surface you're editing.
- **Windows:** "LF will be replaced by CRLF" warnings from git are harmless.

## Decisions and rules

The decision log is MASTER.md §10. The three from Nov 14: **California is the market**, **the organizer side is permanent**, and **sample data is fine until the team switches to real data** (labelled "Sample", with `is_sample = true` where stored).

How we work (MASTER.md §6): one card per feature branch, pull request into `main`, **merge commit only** (no squash or rebase), keep branches, never force-push, and changes to `MASTER.md` go in their own small pull request. Duke prefers plain-language explanations and wants to be asked before you commit, push or open a pull request.

## Known gaps

- **Untested on a real deployment:** the full signed-in flow for both email and Google, reading a real vendor packet with the extractor, and publishing a real event. Publishing writes a real row to the shared database and needs `SUPABASE_SERVICE_ROLE_KEY` on the server.
- **California is not yet reflected in code:** the vendor county filter and map, as above.
- **Organizer data is sample.** Applications, messages and listing activity are not stored anywhere; moving them to real tables is an open card in MASTER.md §7.
- **The researched California event set** (32 events) lives outside the repo and is not loaded into the database. Ask Duke.
- **Settings that live in dashboards, not the repo:**
  - Supabase: Authentication redirect URLs must include `https://booth-finder-bice.vercel.app/**`, `https://*-duke-s-projects1.vercel.app/**` and `http://localhost:3000/**`, or Google sign-in lands signed out. "Confirm email" is turned off for the weekend. Google test users are managed in Google Cloud.
  - Vercel: environment variables, and Deployment Protection for preview links.
- **Superseded branch:** `docs/dual-sided-decision` was replaced by the MASTER.md update and is left in place.
