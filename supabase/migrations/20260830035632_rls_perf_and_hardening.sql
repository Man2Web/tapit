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
