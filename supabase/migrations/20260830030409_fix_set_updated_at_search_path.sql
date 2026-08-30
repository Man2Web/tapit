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
