-- Phase 0 foundation schema — see docs/PRODUCT.md §6.
-- Scope: user_profiles, profiles, profile_links + RLS.
-- organizations / org_members land in a later migration (Phase 3); profiles.org_id
-- is added by ALTER TABLE at that point rather than left as a dangling FK now.

-- ============ IDENTITY ============

create table public.user_profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text unique,
  email text,
  avatar_url text,
  plan text not null default 'free',        -- free | pro | team
  plan_expires_at timestamptz,
  onboarding_done boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "user_profiles: select own"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "user_profiles: insert own"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "user_profiles: update own"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============ THE CARD ============

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  username text unique not null,             -- the public slug: /u/<username>
  is_primary boolean default true,
  is_active boolean default true,            -- offboarding kills this, not the row

  -- content
  display_name text not null,
  designation text,
  company text,
  bio text,
  avatar_url text,
  cover_url text,
  logo_url text,

  -- presentation
  theme jsonb default '{}',                  -- {template, primary, accent, font, layout}
  template_locked boolean default false,     -- org-enforced (Phase 3)

  -- behaviour
  direct_link_url text,                      -- if set, /u/x redirects straight here
  lead_capture_enabled boolean default false,
  lead_capture_config jsonb default '{}',

  view_count bigint default 0,               -- denormalized counter, updated by trigger (Phase 1)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint username_format check (username ~ '^[a-z0-9_-]{3,30}$')
);

create index on public.profiles (username);
create index on public.profiles (owner_id);

alter table public.profiles enable row level security;

create policy "profiles: public read active"
  on public.profiles for select
  using (is_active = true);

create policy "profiles: owner read own"
  on public.profiles for select
  using (auth.uid() = owner_id);

create policy "profiles: owner insert"
  on public.profiles for insert
  with check (auth.uid() = owner_id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "profiles: owner delete"
  on public.profiles for delete
  using (auth.uid() = owner_id);

-- link blocks on a card
create type link_kind as enum (
  'phone','whatsapp','email','website','address','upi','payment',
  'social','file','video','calendar','custom'
);

create table public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  kind link_kind not null,
  platform text,                             -- 'instagram','linkedin','youtube', ...
  label text not null,
  value text not null,                       -- url / number / upi id / storage path
  icon text,
  position int not null default 0,
  is_visible boolean default true,
  click_count bigint default 0,
  created_at timestamptz not null default now()
);

create index on public.profile_links (profile_id, position);

alter table public.profile_links enable row level security;

create policy "profile_links: public read visible on active profile"
  on public.profile_links for select
  using (
    is_visible = true
    and exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.is_active = true
    )
  );

create policy "profile_links: owner read all"
  on public.profile_links for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = auth.uid()
    )
  );

create policy "profile_links: owner insert"
  on public.profile_links for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = auth.uid()
    )
  );

create policy "profile_links: owner update"
  on public.profile_links for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = auth.uid()
    )
  );

create policy "profile_links: owner delete"
  on public.profile_links for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = auth.uid()
    )
  );

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
-- Security advisor fix: pin search_path on set_updated_at so it can't be hijacked
-- via a mutable search_path (function_search_path_mutable lint).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- Auto-create a user_profiles row whenever a new auth.users row appears, regardless
-- of provider (Google now, phone OTP later). SECURITY DEFINER is required because this
-- fires during GoTrue's own insert, outside any authenticated request context — RLS on
-- user_profiles (auth.uid() = id) would otherwise reject it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.user_profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- Addresses Supabase advisor warnings surfaced after Phase 0 + auth work:
-- 1. auth_rls_initplan: wrap auth.uid() as (select auth.uid()) so it's evaluated once per
--    query instead of once per row.
-- 2. multiple_permissive_policies: profiles/profile_links each had two SELECT policies
--    (owner + public) doing redundant work on every query; merged into one per table.
-- 3. anon/authenticated_security_definer_function_executable: handle_new_user() is only
--    meant to run via the auth.users trigger, not be called directly over PostgREST.

-- ============ user_profiles ============

drop policy "user_profiles: select own" on public.user_profiles;
drop policy "user_profiles: insert own" on public.user_profiles;
drop policy "user_profiles: update own" on public.user_profiles;

create policy "user_profiles: select own"
  on public.user_profiles for select
  using ((select auth.uid()) = id);

create policy "user_profiles: insert own"
  on public.user_profiles for insert
  with check ((select auth.uid()) = id);

create policy "user_profiles: update own"
  on public.user_profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ============ profiles ============

drop policy "profiles: public read active" on public.profiles;
drop policy "profiles: owner read own" on public.profiles;
drop policy "profiles: owner insert" on public.profiles;
drop policy "profiles: owner update" on public.profiles;
drop policy "profiles: owner delete" on public.profiles;

create policy "profiles: select"
  on public.profiles for select
  using (is_active = true or (select auth.uid()) = owner_id);

create policy "profiles: owner insert"
  on public.profiles for insert
  with check ((select auth.uid()) = owner_id);

create policy "profiles: owner update"
  on public.profiles for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "profiles: owner delete"
  on public.profiles for delete
  using ((select auth.uid()) = owner_id);

-- ============ profile_links ============

drop policy "profile_links: public read visible on active profile" on public.profile_links;
drop policy "profile_links: owner read all" on public.profile_links;
drop policy "profile_links: owner insert" on public.profile_links;
drop policy "profile_links: owner update" on public.profile_links;
drop policy "profile_links: owner delete" on public.profile_links;

create policy "profile_links: select"
  on public.profile_links for select
  using (
    (is_visible = true and exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.is_active = true
    ))
    or exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = (select auth.uid())
    )
  );

create policy "profile_links: owner insert"
  on public.profile_links for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = (select auth.uid())
    )
  );

create policy "profile_links: owner update"
  on public.profile_links for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = (select auth.uid())
    )
  );

create policy "profile_links: owner delete"
  on public.profile_links for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_links.profile_id and p.owner_id = (select auth.uid())
    )
  );

-- ============ handle_new_user hardening ============

revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- Support for the onboarding/profile-editor flow (PRODUCT.md §7.1).

-- ============ avatar storage ============

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Convention: objects live at avatars/<user_id>/<filename>.
create policy "avatars: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars: owner update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "avatars: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============ username availability ============

-- profiles' SELECT RLS only shows active or owned rows, so a plain client-side
-- select would report an inactive profile's username as "available" even though
-- the unique constraint would reject it. This bypasses RLS to check truthfully.
create or replace function public.is_username_available(check_username text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.profiles where username = check_username
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
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
-- Editor restructuring inspired by HiHello's Display / Information / Links layout.
-- display_name stays the single source of truth for "the name shown everywhere" (Home tab,
-- public web page, vCard) — first_name/last_name are additional structured input the editor
-- collects and combines into display_name on save, not a replacement for it.
alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column accreditations text,
  add column pronouns text,
  add column department text;

-- logo_url already existed in the original Phase 0 schema but had no storage bucket or UI
-- yet — mirrors the avatars bucket's owner-scoped-write / public-read policy shape exactly.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "logos: owner update"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "logos: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
-- Lead capture (PRODUCT.md §6/§7.2's "Exchange Details" flow) — a receiver on the public
-- profile page can optionally share their own name/email/phone with the card owner before
-- downloading the vCard. Scoped down from §6's full `leads` DDL: `org_id`/`assigned_to`/
-- `company`/`message`/`meta` are Phase 3 (organizations don't exist yet) or unused by this
-- specific form; add them via ALTER TABLE when a real leads-inbox screen needs them, same
-- precedent as `profiles.org_id` in the Phase 0 migration.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  name text,
  phone text,
  email text,
  source text not null default 'form',        -- form | nfc | qr | link | scan
  status text not null default 'new',         -- new | contacted | qualified | closed | dropped
  created_at timestamptz not null default now()
);

create index on public.leads (profile_id, created_at desc);

-- RLS: owner can read their own leads. No insert/update/delete policy for anyone — inserts go
-- exclusively through submit_lead() below, matching §6's explicit rule ("insert is allowed
-- anonymously... but only via a security definer RPC that rate-limits and validates — do not
-- expose a raw anon insert policy on the table").
alter table public.leads enable row level security;

create policy "leads: owner read"
  on public.leads for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = leads.profile_id and p.owner_id = (select auth.uid())
    )
  );

-- Anon-callable from the public profile page. Never trusts a client-supplied profile_id —
-- looks it up by username, same pattern as log_profile_event(). Rejects a fully-empty
-- submission (nothing worth saving) and applies a basic per-profile rate limit (max 5 leads
-- per profile per minute) as abuse mitigation.
--
-- Known gap: this is NOT the per-IP rate limit PRODUCT.md §10 specifies ("lead form 5/min per
-- IP") — a stored procedure has no access to the caller's HTTP-layer IP, only the DB
-- connection's (the Supabase pooler's, not the browser's). True per-IP limiting would need a
-- Next.js route handler in front of this RPC, which has real request IP access; not built
-- here. The per-profile limit below protects a given card owner from being spammed by
-- repeated submissions, but doesn't stop one bad actor hitting many different profiles.
create or replace function public.submit_lead(
  p_username text,
  p_name text default null,
  p_phone text default null,
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_recent_count int;
begin
  if coalesce(trim(p_name), '') = '' and coalesce(trim(p_phone), '') = '' and coalesce(trim(p_email), '') = '' then
    return;
  end if;

  select id into v_profile_id
  from public.profiles
  where username = p_username and is_active = true;

  if v_profile_id is null then
    return;
  end if;

  select count(*) into v_recent_count
  from public.leads
  where profile_id = v_profile_id and created_at > now() - interval '1 minute';

  if v_recent_count >= 5 then
    return;
  end if;

  insert into public.leads (profile_id, name, phone, email, source)
  values (
    v_profile_id,
    nullif(trim(p_name), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_email), ''),
    'form'
  );
end;
$$;

grant execute on function public.submit_lead(text, text, text, text) to anon, authenticated;
-- Delete Account (PRODUCT.md §10: "an in-app Delete Account flow" is an explicit app-store
-- submission blocker, and DPDP Act §10 wants deletion to actually be deletion, not just an
-- inaccessible row). supabase-js has no client-callable "delete my own auth user" — that
-- normally needs a service-role call — so this is the standard self-delete workaround: a
-- SECURITY DEFINER function that only ever targets auth.uid() itself, never a client-supplied
-- id, so there is no way to delete anyone else's account through it.
--
-- Deleting the auth.users row cascades cleanly through the whole schema via existing
-- `on delete cascade` foreign keys: user_profiles, profiles (→ profile_links, profile_events,
-- leads all cascade from profiles), all disappear with it. Storage objects are NOT covered by
-- that cascade (storage.objects has no FK to auth.users), so avatar/logo files are deleted
-- explicitly first — otherwise "deleting" an account would silently leave personal photos
-- behind in storage indefinitely.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return;
  end if;

  delete from storage.objects
  where bucket_id in ('avatars', 'logos')
    and (storage.foldername(name))[1] = v_uid::text;

  delete from auth.users where id = v_uid;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default (bit us before with get_profile_insights) —
-- revoke it explicitly this time instead of needing a follow-up migration to fix it.
revoke execute on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- Expand public.leads table for complete contact profiles & AI business card scanner metadata
alter table public.leads
  add column if not exists company text,
  add column if not exists designation text,
  add column if not exists notes text,
  add column if not exists meta jsonb default '{}'::jsonb;

-- Allow owner to update/delete their own leads
create policy "leads: owner update"
  on public.leads for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = leads.profile_id and p.owner_id = (select auth.uid())
    )
  );

create policy "leads: owner delete"
  on public.leads for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = leads.profile_id and p.owner_id = (select auth.uid())
    )
  );

-- Update submit_lead RPC to accept company, designation, notes, source
create or replace function public.submit_lead(
  p_username text,
  p_name text default null,
  p_phone text default null,
  p_email text default null,
  p_company text default null,
  p_designation text default null,
  p_notes text default null,
  p_source text default 'form'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_recent_count int;
begin
  if coalesce(trim(p_name), '') = '' and coalesce(trim(p_phone), '') = '' and coalesce(trim(p_email), '') = '' then
    return;
  end if;

  select id into v_profile_id
  from public.profiles
  where username = p_username and is_active = true;

  if v_profile_id is null then
    return;
  end if;

  select count(*) into v_recent_count
  from public.leads
  where profile_id = v_profile_id and created_at > now() - interval '1 minute';

  if v_recent_count >= 10 then
    return;
  end if;

  insert into public.leads (
    profile_id,
    name,
    phone,
    email,
    company,
    designation,
    notes,
    source
  )
  values (
    v_profile_id,
    nullif(trim(p_name), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_email), ''),
    nullif(trim(p_company), ''),
    nullif(trim(p_designation), ''),
    nullif(trim(p_notes), ''),
    coalesce(p_source, 'form')
  );
end;
$$;

grant execute on function public.submit_lead(text, text, text, text, text, text, text, text) to anon, authenticated;

