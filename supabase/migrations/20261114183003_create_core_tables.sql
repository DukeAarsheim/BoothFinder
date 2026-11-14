-- APPLIED 2026-11-14 (version 20261114183003). Do not edit: applied migrations are never changed.
--
-- First draft of the core tables, created the morning of Nov 14 before the schema in
-- MASTER.md §5 was finalised. It never held any rows. It is superseded by the
-- "rebuild_core_tables_to_match_master" migration that follows; the file stays here so the
-- repo matches the migration history recorded in Supabase.

create table public.events (
  id text primary key,
  name text not null,
  event_type text not null
    check (event_type in ('fair', 'race', 'market', 'festival', 'street_fair', 'other')),
  county text not null,
  city text,
  state text not null default 'CA',
  last_dates text,
  next_dates_status text,
  application_deadline text,
  application_status text,
  booth_fee_min numeric(10, 2),
  booth_fee_max numeric(10, 2),
  fee_pct_of_sales numeric(5, 2) check (fee_pct_of_sales is null or (fee_pct_of_sales >= 0 and fee_pct_of_sales <= 100)),
  fee_notes text,
  application_fee numeric(10, 2),
  electricity_fee text,
  attendance integer check (attendance is null or attendance >= 0),
  vendor_spots integer check (vendor_spots is null or vendor_spots >= 0),
  drink_rules_note text,
  exclusive_beverage_deal text,
  apply_url text,
  source_urls text[] not null default '{}',
  permission_note text,
  checked_date date,
  fee_info_year text,
  uses_prior_year_info text,
  created_via text not null default 'seed' check (created_via in ('seed', 'extractor', 'manual')),
  created_at timestamptz not null default now(),
  constraint events_fee_range check (booth_fee_min is null or booth_fee_max is null or booth_fee_min <= booth_fee_max)
);

create index events_county_idx on public.events (county);
create index events_event_type_idx on public.events (event_type);

create table public.event_vendor_lists (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  vendor_name text not null,
  vendor_category text not null check (vendor_category in ('food', 'drink', 'other')),
  source_url text,
  created_at timestamptz not null default now()
);

create index event_vendor_lists_event_year_idx on public.event_vendor_lists (event_id, year);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events (id) on delete cascade,
  booth_cost numeric(10, 2),
  sales_range text,
  traffic smallint check (traffic between 1 and 5),
  competing_vendors integer check (competing_vendors >= 0),
  audience_fit smallint check (audience_fit between 1 and 5),
  organization smallint check (organization between 1 and 5),
  would_return boolean,
  created_at timestamptz not null default now()
);

create index ratings_event_idx on public.ratings (event_id);
