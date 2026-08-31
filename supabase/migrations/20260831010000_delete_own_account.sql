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
