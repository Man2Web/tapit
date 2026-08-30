-- Dev-only seed data. Inserts directly into auth.users to satisfy the FK without
-- running a real OTP signup — fine for a fresh dev project, never run against a
-- project with real users.

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values (
  '00000000-0000-0000-0000-000000000001',
  'seed-user@tapit.dev',
  '',
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
)
on conflict (id) do nothing;

insert into public.user_profiles (id, full_name, plan, onboarding_done)
values ('00000000-0000-0000-0000-000000000001', 'Manikandan', 'free', true)
on conflict (id) do nothing;

insert into public.profiles (id, owner_id, username, display_name, designation, company, bio, is_active)
values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'manikandan',
  'Manikandan',
  'Founder',
  'TapIt',
  'Digital visiting card, one tap away.',
  true
)
on conflict (id) do nothing;

insert into public.profile_links (profile_id, kind, label, value, position)
values
  ('00000000-0000-0000-0000-0000000000a1', 'whatsapp', 'WhatsApp', 'https://wa.me/910000000000', 0),
  ('00000000-0000-0000-0000-0000000000a1', 'email', 'Email', 'mailto:agmanikandan2016@gmail.com', 1),
  ('00000000-0000-0000-0000-0000000000a1', 'website', 'Website', 'https://example.com', 2)
on conflict do nothing;
