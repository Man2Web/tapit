-- Phase 1: Identity Overhaul migration
-- Adds: profile CTA config, section ordering, privacy settings,
-- lead tags & follow-up, expanded analytics events, notifications table.

-- ============ PROFILE ENHANCEMENTS ============

-- Configurable call-to-action buttons on the public profile page.
-- Schema: { buttons: [{ id, label, url, icon, style }], layout: "horizontal" | "vertical" }
alter table public.profiles
  add column if not exists cta_config jsonb default '{"buttons":[]}'::jsonb;

-- Custom section ordering for profile blocks.
-- Schema: string[] of block_type values in display order, e.g. ["contact","social","service"]
alter table public.profiles
  add column if not exists section_order jsonb default '[]'::jsonb;

-- Privacy settings controlling profile visibility and data collection.
-- Schema: { searchable, lead_form_visible, analytics_visible, profile_public }
alter table public.profiles
  add column if not exists privacy_settings jsonb default '{"searchable":true,"lead_form_visible":true,"analytics_visible":true,"profile_public":true}'::jsonb;

-- ============ LEAD ENHANCEMENTS ============

-- Tags for categorizing leads (e.g. ["hot","event-xyz","partner"]).
alter table public.leads
  add column if not exists tags text[] default '{}';

-- Follow-up date for scheduling reminders.
alter table public.leads
  add column if not exists follow_up_at timestamptz;

-- ============ EXPANDED EVENT TRACKING ============

-- Drop the old check constraint so we can add new event types.
-- The existing constraint: event in ('view', 'link_click', 'vcard_save')
alter table public.profile_events
  drop constraint if exists profile_events_event_check;

-- Re-add with expanded event types for granular analytics.
alter table public.profile_events
  add constraint profile_events_event_check
  check (event in (
    'view',
    'link_click',
    'vcard_save',
    'phone_click',
    'email_click',
    'whatsapp_click',
    'website_click',
    'social_click',
    'meeting_book',
    'contact_save',
    'message_send',
    'cta_click',
    'qr_scan',
    'nfc_tap',
    'wallet_add'
  ));

-- Link-level click tracking: which specific link or block was interacted with.
-- link_id already exists (references profile_links), add block_id for profile_blocks.
alter table public.profile_events
  add column if not exists block_id uuid references public.profile_blocks on delete set null;

-- ============ NOTIFICATIONS ============

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in (
    'new_lead',
    'contact_saved',
    'profile_milestone',
    'follow_up_due',
    'team_invitation',
    'device_activated',
    'system'
  )),
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications: user read own"
  on public.notifications for select
  using ((select auth.uid()) = user_id);

create policy "notifications: user update own"
  on public.notifications for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No direct insert policy — notifications are created server-side via triggers/RPCs.

-- ============ ENHANCED INSIGHTS RPC ============

-- Replaces the existing get_profile_insights() with an expanded version
-- that supports date-range filtering and more event types.
create or replace function public.get_profile_insights(
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns table (
  views bigint,
  qr_views bigint,
  vcard_saves bigint,
  phone_clicks bigint,
  email_clicks bigint,
  whatsapp_clicks bigint,
  website_clicks bigint,
  social_clicks bigint,
  meeting_books bigint,
  contact_saves bigint,
  cta_clicks bigint,
  total_interactions bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    count(*) filter (where event = 'view') as views,
    count(*) filter (where event = 'view' and source = 'qr') as qr_views,
    count(*) filter (where event = 'vcard_save') as vcard_saves,
    count(*) filter (where event = 'phone_click') as phone_clicks,
    count(*) filter (where event = 'email_click') as email_clicks,
    count(*) filter (where event = 'whatsapp_click') as whatsapp_clicks,
    count(*) filter (where event = 'website_click') as website_clicks,
    count(*) filter (where event = 'social_click') as social_clicks,
    count(*) filter (where event = 'meeting_book') as meeting_books,
    count(*) filter (where event = 'contact_save') as contact_saves,
    count(*) filter (where event = 'cta_click') as cta_clicks,
    count(*) as total_interactions
  from public.profile_events
  where profile_id = (
    select id from public.profiles
    where owner_id = (select auth.uid()) and is_primary = true
  )
  and (p_start_at is null or created_at >= p_start_at)
  and (p_end_at is null or created_at <= p_end_at);
$$;

grant execute on function public.get_profile_insights(timestamptz, timestamptz) to authenticated;

-- ============ LOG EXPANDED EVENTS ============

-- Update log_profile_event to accept a block_id for block-level tracking.
create or replace function public.log_profile_event(
  p_username text,
  p_event text,
  p_source text default null,
  p_link_id uuid default null,
  p_block_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if p_event not in (
    'view', 'link_click', 'vcard_save', 'phone_click', 'email_click',
    'whatsapp_click', 'website_click', 'social_click', 'meeting_book',
    'contact_save', 'message_send', 'cta_click', 'qr_scan', 'nfc_tap', 'wallet_add'
  ) then
    return;
  end if;

  select id into v_profile_id
  from public.profiles
  where username = p_username and is_active = true;

  if v_profile_id is null then
    return;
  end if;

  insert into public.profile_events (profile_id, event, source, link_id, block_id)
  values (v_profile_id, p_event, p_source, p_link_id, p_block_id);
end;
$$;

grant execute on function public.log_profile_event(text, text, text, uuid, uuid) to anon, authenticated;

-- ============ MARK NOTIFICATIONS AS READ ============

create or replace function public.mark_notifications_read(p_notification_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifications
  set read_at = now()
  where id = any(p_notification_ids)
    and user_id = (select auth.uid())
    and read_at is null;
end;
$$;

revoke execute on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
