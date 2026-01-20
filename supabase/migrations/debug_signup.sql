-- Diagnostic queries to check signup trigger setup
-- Run these in Supabase SQL Editor to debug the issue

-- 1. Check if the trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created_household';

-- 2. Check if the function exists
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user_household';

-- 3. Check current households
SELECT id, name, created_at FROM households ORDER BY created_at DESC LIMIT 5;

-- 4. Check household members
SELECT
  hm.id,
  hm.user_id,
  hm.email,
  hm.role,
  h.name as household_name
FROM household_members hm
LEFT JOIN households h ON h.id = hm.household_id
ORDER BY hm.created_at DESC LIMIT 5;

-- 5. Test the trigger function manually (won't actually create a user)
-- Uncomment and modify the email to test
-- SELECT handle_new_user_household();

-- 6. Check RLS policies on household tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('households', 'household_members', 'household_invitations')
ORDER BY tablename, policyname;

-- 7. Check for any users without households
SELECT
  u.id as user_id,
  u.email,
  hm.household_id
FROM auth.users u
LEFT JOIN household_members hm ON hm.user_id = u.id
WHERE hm.household_id IS NULL;
