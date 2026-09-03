-- Expand public.leads table for complete contact profiles & AI business card scanner metadata
alter table public.leads
  add column if not exists company text,
  add column if not exists designation text,
  add column if not exists notes text,
  add column if not exists meta jsonb default '{}'::jsonb;

-- Update submit_lead RPC to accept company, designation, notes
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
