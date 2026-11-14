# BoothFinder

Boothfinder helps small food and drink brands find events that are seeking vendors, and shows which ones are worth the booth fee. This repo is our hackathon demo.

> **Read [MASTER.md](MASTER.md) before you change anything.** It is the single source of truth for scope, rules, and the build plan. This README only covers getting the project running and where things go.

## Getting started

You need [Node.js](https://nodejs.org) 20.9 or newer.

1. Clone the repo and install:
   ```
   git clone https://github.com/DukeAarsheim/BoothFinder.git
   cd BoothFinder
   npm install
   ```
2. Create your env file: copy `.env.example` to `.env.local` and fill in the two public Supabase values. Duke sends them privately. Never put them in the repo.
3. Start the app:
   ```
   npm run dev
   ```
4. Open http://localhost:3000/events. It lists the events in the database, or says the table is empty. If it says the database isn't connected, check `.env.local` and restart.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server with live reload |
| `npm run build` | Production build. It must pass before every pull request |
| `npm run start` | Serves the production build |
| `npm run lint` | Checks the code with ESLint |

## How we work

The full rules are in MASTER.md §6. The short version:

1. Start from fresh `main`: `git checkout main`, then `git pull`.
2. Claim one card on the board, then branch: `git checkout -b feat/<card-short-name>`.
3. Build only what the card says. Commit small and often.
4. Before opening a pull request, pull `main` into your branch and run `npm run build`.
5. Open a pull request into `main`. Merge with a **merge commit**, never squash or rebase, and keep the branch afterwards.

Don't push straight to `main`, don't force-push, and don't commit keys.

## Where things go

```
app/                   pages and routes
  page.tsx             home page
  events/              event list (reads the database)
  extract/             extractor screen (placeholder)
  rate/                rating flow (placeholder)
  api/extract/         server route that calls the LLM (not created yet)
components/
  ui/                  shared pieces: SiteHeader, PageContainer, Notice
  events/ extract/ fit/ ratings/    one folder per feature (create it when you need it)
lib/
  types.ts             shared types (protected, see MASTER.md §6)
  supabase/            database clients and generated database types
  scoring/             pure Fit-score functions and config (not created yet)
  extractor/           prompt and parsing logic (not created yet)
supabase/migrations/   database changes (protected, see MASTER.md §5b)
data/seed/             seed data (not created yet)
public/                static files (not created yet)
```

## Look and feel

There is one dark theme, matching the landing hero in MASTER.md §12:

- Page background `bg-neutral-950`, text `text-neutral-100`, secondary text `text-neutral-300` or `text-neutral-400`.
- Borders `border-neutral-800`, raised surfaces `bg-neutral-900`.
- Accent `emerald-400` (buttons, highlights).
- There is no light theme, so don't add `dark:` classes.

Wrap regular pages in `<PageContainer>` so every page has the same width and padding. Use `<Notice>` for empty states, errors, and "not built yet" messages.

## Loading data in pages

This project runs Next.js 16 with Cache Components turned on. It is stricter than older Next.js versions, and it differs from what most AI tools assume:

- Keep the page component itself synchronous.
- Put anything that reads live data in an `async` component. Call `await connection()` first, then query. Wrap that component in `<Suspense>` with a fallback.
- `export const dynamic = "force-dynamic"` does not work here.

[app/events/page.tsx](app/events/page.tsx) is the working example to copy. If a build fails with a message about "uncached data", this pattern is the fix. The docs for the installed version are in `node_modules/next/dist/docs/`.

One thing that looks like a bug and isn't: the loaded content swaps in when the browser paints the page. A tab in the background, or an AI agent's hidden browser, keeps showing the "Loading…" text until the tab is shown. Bring the tab forward, or have the agent take a screenshot, before deciding a page is stuck.

## Database (Supabase)

There are three tables: `events`, `event_vendor_lists`, and `ratings`. The newest file in `supabase/migrations/` describes every column, and the same notes show in the Supabase table editor.

| Table | Public key (safe in the browser) | Service-role key (server only) |
| --- | --- | --- |
| `events` | Read only | Read and write |
| `event_vendor_lists` | Read only | Read and write |
| `ratings` | No access | Read and write |

- **Reading:** use `getSupabaseClient()` from `lib/supabase/client.ts`.
- **Writing, and anything with ratings:** do it in server code (a route handler or server action) with `getSupabaseAdmin()` from `lib/supabase/admin.ts`. Importing that file into client code fails the build on purpose.
- **Changing the schema:** add a new file in `supabase/migrations/` and never edit an existing one. After your pull request merges, ping Duke to apply it (MASTER.md §5b). Duke then regenerates `lib/supabase/database.types.ts`.
- **Types:** import row types and shared shapes from `lib/types.ts`.
- **No invented data:** a field the source doesn't state stays `null`. Any made-up row needs `is_sample = true` and a visible "Sample" label.

## Environment variables

| Name | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | Public and read-only. The newer "publishable" key also works |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Secret. Only Duke and Vercel hold it. Not needed for pages that only read events |

If your card adds a variable, add its **name** to `.env.example` and ask Duke to add it to Vercel.

## Deployment

Vercel builds every push. `main` is the live site, and each pull request gets its own preview link. Check the preview before you merge.

## Tips

- Pull before you start, push when you finish, so you don't overwrite each other.
- Try not to edit the same Word/PowerPoint/image file at the same time; Git can't merge those.
- GitHub rejects files over 100 MB.
- This repo is public: don't put passwords or private info here.
