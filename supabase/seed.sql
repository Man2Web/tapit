-- Create Auth User with password 'Man2web@2026' linked ONLY to profile 'themanikandanag'
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fzxgikhutdptltvcruej/sql/new

-- 1. Create or update auth.users with bcrypt hashed password 'Man2web@2026'
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'm2wtechnologies@gmail.com',
  extensions.crypt('Man2web@2026', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Manikandan AG"}',
  'authenticated',
  'authenticated'
)
on conflict (id) do update set
  encrypted_password = extensions.crypt('Man2web@2026', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now());

-- 2. User Profile
insert into public.user_profiles (id, full_name, email, plan, onboarding_done)
values ('00000000-0000-0000-0000-000000000001', 'Manikandan AG', 'm2wtechnologies@gmail.com', 'pro', true)
on conflict (id) do update set full_name = 'Manikandan AG', email = 'm2wtechnologies@gmail.com', onboarding_done = true;

-- 3. Cleanup unwanted profile if present
delete from public.profiles where username = 'themanikandan';

-- 4. Single Profile: themanikandanag
insert into public.profiles (
  id,
  owner_id,
  username,
  display_name,
  first_name,
  last_name,
  designation,
  company,
  bio,
  is_primary,
  is_active
)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'themanikandanag',
  'Manikandan AG',
  'Manikandan',
  'AG',
  'Co-founder',
  'Man2web Technologies',
  'Co-founder of Man2web Technologies. Digital visiting card, one tap away.',
  true,
  true
)
on conflict (username) do update set
  display_name = excluded.display_name,
  designation = excluded.designation,
  company = excluded.company,
  bio = excluded.bio,
  is_primary = true;

-- 5. Profile Links for themanikandanag
insert into public.profile_links (profile_id, kind, platform, label, value, position)
values
  ('00000000-0000-0000-0000-0000000000a1', 'website', null, 'Website', 'https://man2web.in', 0),
  ('00000000-0000-0000-0000-0000000000a1', 'email', null, 'Email', 'mailto:m2wtechnologies@gmail.com', 1)
on conflict do nothing;
