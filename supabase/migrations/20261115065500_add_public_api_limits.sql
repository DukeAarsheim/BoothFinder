-- Server-only anonymous request limits, shared across serverless instances.
-- A keyed digest of the client IP is stored instead of the address itself.
create table public.public_api_limits (
  bucket_key text not null check (bucket_key = 'global' or bucket_key ~ '^[0-9a-f]{64}$'),
  action text not null check (action in ('publish', 'extract', 'assistant')),
  window_started timestamptz not null,
  requests integer not null check (requests > 0),
  primary key (bucket_key, action)
);
create index public_api_limits_window_started_idx on public.public_api_limits (window_started);

alter table public.public_api_limits enable row level security;
revoke all on public.public_api_limits from public, anon, authenticated;
grant select, insert, update, delete on public.public_api_limits to service_role;

-- Returns 0 when admitted or seconds until retry. Both buckets are atomic.
create function public.consume_public_api_limit(
  p_bucket text,
  p_action text,
  p_client_limit integer,
  p_global_limit integer,
  p_window_seconds integer
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_time_utc timestamptz := pg_catalog.clock_timestamp();
  key_to_check text;
  limit_to_check integer;
  retry_seconds integer;
begin
  if p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$'
     or p_action not in ('publish', 'extract', 'assistant')
     or p_client_limit < 1 or p_global_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit parameters';
  end if;

  for key_to_check, limit_to_check in
    select * from (values (p_bucket, p_client_limit), ('global', p_global_limit)) as limits(bucket, max_requests)
  loop
    insert into public.public_api_limits as existing (bucket_key, action, window_started, requests)
    values (key_to_check, p_action, current_time_utc, 1)
    on conflict (bucket_key, action) do update set
      window_started = case
        when existing.window_started + pg_catalog.make_interval(secs => p_window_seconds) <= current_time_utc
          then current_time_utc else existing.window_started end,
      requests = case
        when existing.window_started + pg_catalog.make_interval(secs => p_window_seconds) <= current_time_utc
          then 1 else existing.requests + 1 end
    where existing.window_started + pg_catalog.make_interval(secs => p_window_seconds) <= current_time_utc
       or existing.requests < limit_to_check;

    if not found then
      select greatest(1, pg_catalog.ceil(extract(epoch from
        window_started + pg_catalog.make_interval(secs => p_window_seconds) - current_time_utc))::integer)
        into retry_seconds from public.public_api_limits
        where bucket_key = key_to_check and action = p_action;
      return coalesce(retry_seconds, p_window_seconds);
    end if;
  end loop;

  -- Periodically remove stale client buckets without needing a scheduled job.
  if pg_catalog.random() < 0.01 then
    delete from public.public_api_limits
      where bucket_key <> 'global' and window_started < current_time_utc - interval '1 day';
  end if;
  return 0;
end;
$$;

revoke all on function public.consume_public_api_limit(text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_public_api_limit(text, text, integer, integer, integer)
  to service_role;
