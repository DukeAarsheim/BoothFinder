-- APPLIED 2026-11-14 (version 20261114183023). Do not edit: applied migrations are never changed.
--
-- Row-level security for the first-draft tables. Superseded by the
-- "rebuild_core_tables_to_match_master" migration that follows, which re-creates the same
-- protections on the final tables.

alter table public.events enable row level security;
alter table public.event_vendor_lists enable row level security;
alter table public.ratings enable row level security;

create policy "Anyone can read events"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "Anyone can read vendor lists"
  on public.event_vendor_lists for select
  to anon, authenticated
  using (true);
