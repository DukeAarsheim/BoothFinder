-- Rebuild the three core tables so they match the data model in MASTER.md §5.
--
-- Why a rebuild: 20261114183003_create_core_tables made a first draft of these tables
-- earlier the same morning. The drafts never held a row and no application code read
-- them, so this migration drops the empty drafts and creates the final tables instead
-- of patching them column by column.
--
-- From here on, follow MASTER.md §5b: one small migration per change, add columns
-- rather than rename or drop them, and never edit an applied migration.

drop table if exists public.ratings;
drop table if exists public.event_vendor_lists;
drop table if exists public.events;

-- Keeps updated_at current. Attached to each table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- events: one row per event (one row per season for a recurring market).
-- Every fact column is nullable so the extractor can save what a source states
-- and leave the rest empty. Never fill a gap with a guess.
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  event_type text not null default 'other'
    check (event_type in ('fair', 'race', 'market', 'festival', 'street_fair', 'other')),

  -- When
  start_date date,
  end_date date,
  day_type text check (day_type in ('weekday', 'weekend', 'mixed')),
  schedule_notes text,

  -- Where
  venue text,
  city text,
  county text,

  -- Source and how to apply
  source_url text,
  apply_url text,
  how_to_apply text,
  application_deadline date,

  -- Costs
  booth_fee_min numeric(10, 2) check (booth_fee_min >= 0),
  booth_fee_max numeric(10, 2) check (booth_fee_max >= 0),
  fee_pct_of_sales numeric(5, 2) check (fee_pct_of_sales >= 0 and fee_pct_of_sales <= 100),
  application_fee numeric(10, 2) check (application_fee >= 0),
  electricity_fee numeric(10, 2) check (electricity_fee >= 0),
  fee_notes text,
  fee_info_year integer check (fee_info_year between 2000 and 2100),
  booth_size text,

  -- Crowd and competition
  expected_attendance integer check (expected_attendance >= 0),
  attendance_source text,
  vendor_spots integer check (vendor_spots >= 0),
  similar_vendor_limit text,

  notes text,
  is_sample boolean not null default false,
  created_via text not null default 'manual' check (created_via in ('manual', 'extractor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_dates_in_order
    check (start_date is null or end_date is null or end_date >= start_date),
  constraint events_fees_in_order
    check (booth_fee_min is null or booth_fee_max is null or booth_fee_min <= booth_fee_max)
);

comment on table public.events is 'Events that take vendors. Facts come from organizer or government sources; unknown values stay null.';
comment on column public.events.event_type is 'fair | race | market | festival | street_fair | other';
comment on column public.events.start_date is 'First day of the edition this row describes. Null for recurring markets or when not published.';
comment on column public.events.day_type is 'weekday | weekend | mixed. Feeds the weekday/weekend sales adjustment (MASTER.md section 4).';
comment on column public.events.schedule_notes is 'Free text for what the date columns cannot hold, e.g. Wednesdays 3-7 pm, Apr 15 to Oct 21.';
comment on column public.events.source_url is 'The organizer page or PDF these facts came from.';
comment on column public.events.how_to_apply is 'Application instructions in plain words (form, email, waitlist, who to contact).';
comment on column public.events.booth_fee_min is 'Lowest booth fee in dollars. Equal to booth_fee_max when there is a single fee.';
comment on column public.events.fee_pct_of_sales is 'Percent of gross sales the organizer takes, 0-100. Null when there is none.';
comment on column public.events.fee_notes is 'Fee details numbers alone cannot express, e.g. a 2,000 dollar minimum or 25 percent of sales, whichever is greater.';
comment on column public.events.fee_info_year is 'The year the fee figures were published. Lets the UI flag fees from an earlier edition.';
comment on column public.events.expected_attendance is 'Attendance for the whole event as the source states it. Not an estimate.';
comment on column public.events.attendance_source is 'Where expected_attendance came from (organizer page, press release, race results).';
comment on column public.events.similar_vendor_limit is 'Any stated cap on competing or similar vendors, in the words of the source.';
comment on column public.events.is_sample is 'True only for made-up demo rows. Must be labeled Sample wherever shown.';
comment on column public.events.created_via is 'manual | extractor';

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- event_vendor_lists: one row per vendor at one event in one year.
-- Powers returning-vendor rate and vendor density.
-- ---------------------------------------------------------------------------
create table public.event_vendor_lists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  vendor_name text not null check (length(btrim(vendor_name)) > 0),
  vendor_category text not null default 'other'
    check (vendor_category in ('food', 'drink', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_vendor_lists_one_row_per_vendor unique (event_id, year, vendor_name)
);

comment on table public.event_vendor_lists is 'One row per vendor at one event in one year. Used for returning-vendor rate and vendor density.';
comment on column public.event_vendor_lists.vendor_category is 'food | drink | other';

create trigger event_vendor_lists_set_updated_at
  before update on public.event_vendor_lists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ratings: one vendor report on one event (give-to-get).
-- ---------------------------------------------------------------------------
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  booth_cost numeric(10, 2) check (booth_cost >= 0),
  sales_range text,
  traffic smallint check (traffic between 1 and 5),
  competing_vendors integer check (competing_vendors >= 0),
  audience_fit smallint check (audience_fit between 1 and 5),
  organization smallint check (organization between 1 and 5),
  would_return boolean,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ratings is 'One vendor report on one event. Not readable with the public key; go through server routes.';
comment on column public.ratings.sales_range is 'A range the vendor picked, e.g. 500-1,000. Stored as text on purpose.';
comment on column public.ratings.traffic is '1 to 5';
comment on column public.ratings.audience_fit is '1 to 5. Feeds Q_audience in the Fit score.';
comment on column public.ratings.organization is '1 to 5. Feeds Q_organization in the Fit score.';
comment on column public.ratings.is_sample is 'True only for made-up demo rows. Must be labeled Sample wherever shown.';

create index ratings_event_id_idx on public.ratings (event_id);

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access. The repo and the anon key are public, so the anon key can only read.
--   events, event_vendor_lists: anyone can read; nobody can write with the anon key.
--   ratings: no access at all with the anon key. Reads and writes go through server
--            routes that use the service-role key (which bypasses row-level security).
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.event_vendor_lists enable row level security;
alter table public.ratings enable row level security;

create policy "Public can read events"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "Public can read vendor lists"
  on public.event_vendor_lists for select
  to anon, authenticated
  using (true);

revoke all on public.events, public.event_vendor_lists, public.ratings from anon, authenticated;
grant select on public.events, public.event_vendor_lists to anon, authenticated;
grant all on public.events, public.event_vendor_lists, public.ratings to service_role;
