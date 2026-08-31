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
