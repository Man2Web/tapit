-- Basic view analytics (PRODUCT.md §3 Phase 1, §6's profile_events table) — backs a mobile
-- Insights tab showing profile views, QR scans, and vCard (save-to-phone) counts.
--
-- Deliberately skips the pg_cron/profile_stats_daily rollup pipeline described in §4.2 for
-- now — that's a scale optimization for "thousands of views a day", nowhere near this app's
-- current volume. get_profile_insights() aggregates profile_events directly. The "no raw
-- event exposure to the client" security intent behind the profile_stats_daily indirection is
-- kept regardless — profile_events has zero SELECT policies; this function is the only
-- reader, and it returns rollup counts only. Revisit with a daily rollup + pruning once real
-- volume justifies it.

create table public.profile_events (
  id bigserial primary key,
  profile_id uuid not null references public.profiles on delete cascade,
  event text not null check (event in ('view', 'link_click', 'vcard_save')),
  link_id uuid references public.profile_links on delete set null,
  source text,                                -- qr | link | nfc | wallet | signature
  created_at timestamptz not null default now()
);

create index on public.profile_events (profile_id, created_at desc);

-- RLS enabled, deliberately with zero policies: no direct client select or insert. All
-- access goes through the two SECURITY DEFINER functions below.
alter table public.profile_events enable row level security;

-- Called anonymously from the public profile page (view / vcard_save). Never trusts a
-- client-supplied profile_id — looks it up by username, so a caller can only ever log an
-- event against a real, active profile.
create or replace function public.log_profile_event(
  p_username text,
  p_event text,
  p_source text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if p_event not in ('view', 'link_click', 'vcard_save') then
    return;
  end if;

  select id into v_profile_id
  from public.profiles
  where username = p_username and is_active = true;

  if v_profile_id is null then
    return;
  end if;

  insert into public.profile_events (profile_id, event, source)
  values (v_profile_id, p_event, p_source);
end;
$$;

grant execute on function public.log_profile_event(text, text, text) to anon, authenticated;

-- Called from the mobile app's Insights tab (signed in). Scoped to the caller's own primary
-- profile via auth.uid() — takes no profile_id argument, so there's no way to query anyone
-- else's counts.
create or replace function public.get_profile_insights()
returns table (views bigint, qr_views bigint, vcard_saves bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select
    count(*) filter (where event = 'view') as views,
    count(*) filter (where event = 'view' and source = 'qr') as qr_views,
    count(*) filter (where event = 'vcard_save') as vcard_saves
  from public.profile_events
  where profile_id = (
    select id from public.profiles
    where owner_id = (select auth.uid()) and is_primary = true
  );
$$;

grant execute on function public.get_profile_insights() to authenticated;
