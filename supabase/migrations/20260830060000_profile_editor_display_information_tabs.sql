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
