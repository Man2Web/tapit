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
