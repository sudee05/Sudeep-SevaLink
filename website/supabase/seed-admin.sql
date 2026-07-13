-- =============================================
-- Create Admin User for SevaLink
-- Run this in the Supabase SQL Editor
-- =============================================

-- Step 1: Create the auth user
-- (Supabase uses pgcrypto for password hashing)
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  role,
  aud,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@sevalink.com',                              -- ← Change email if needed
  crypt('Admin@123', gen_salt('bf')),                 -- ← Change password if needed
  now(),                                              -- Email is pre-confirmed
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "SevaLink Admin", "role": "admin"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
);

-- Step 2: Create the identity record (required for email login)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id,
  u.id,
  json_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  now(),
  now(),
  now()
from auth.users u
where u.email = 'admin@sevalink.com';

-- Step 3: Ensure the profile has admin role
-- (The trigger should auto-create this, but let's make sure)
update public.profiles
set role = 'admin', full_name = 'SevaLink Admin'
where id = (select id from auth.users where email = 'admin@sevalink.com');

-- ✅ Done! Login with:
--    Email:    admin@sevalink.com
--    Password: Admin@123
