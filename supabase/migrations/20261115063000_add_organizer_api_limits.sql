-- Shared, atomic limits for authenticated organizer API calls. One row per
-- user and action keeps the table bounded and works across Vercel instances.
create table public.organizer_api_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('publish', 'extract', 'assistant')),
  window_started timestamptz not null,
  requests integer not null check (requests > 0),
  primary key (user_id, action)
);

alter table public.organizer_api_limits enable row level security;
revoke all on public.organizer_api_limits from public, anon, authenticated;
grant select, insert, update, delete on public.organizer_api_limits to service_role;

-- Returns 0 when admitted, or the number of seconds to wait when limited.
create function public.consume_organizer_api_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_time_utc timestamptz := pg_catalog.clock_timestamp();
  retry_seconds integer;
begin
  if p_user_id is null or p_action not in ('publish', 'extract', 'assistant')
     or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.organizer_api_limits as existing (user_id, action, window_started, requests)
  values (p_user_id, p_action, current_time_utc, 1)
  on conflict (user_id, action) do update set
    window_started = case
      when existing.window_started + pg_catalog.make_interval(secs => p_window_seconds) <= current_time_utc
        then current_time_utc else existing.window_started end,
    requests = case
      when existing.window_started + pg_catalog.make_interval(secs => p_window_seconds) <= current_time_utc
        then 1 else existing.requests + 1 end
  where existing.window_started + pg_catalog.make_interval(secs => p_window_seconds) <= current_time_utc
     or existing.requests < p_limit;

  if found then return 0; end if;

  select greatest(1, pg_catalog.ceil(extract(epoch from
    window_started + pg_catalog.make_interval(secs => p_window_seconds) - current_time_utc))::integer)
    into retry_seconds
    from public.organizer_api_limits
    where user_id = p_user_id and action = p_action;
  return coalesce(retry_seconds, p_window_seconds);
end;
$$;

revoke all on function public.consume_organizer_api_limit(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_organizer_api_limit(uuid, text, integer, integer)
  to service_role;
