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
