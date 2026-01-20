-- One-time data migration: Assign existing shows/recommendations to households
-- Run this AFTER 001_add_households.sql
-- This script handles existing users and their data

-- Step 1: Create households for existing users who don't have one
DO $$
DECLARE
  user_record RECORD;
  new_household_id UUID;
BEGIN
  -- Loop through all existing users who aren't in a household yet
  FOR user_record IN
    SELECT id, email FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM household_members)
  LOOP
    -- Create a new household for this user
    INSERT INTO households (name)
    VALUES (split_part(user_record.email, '@', 1) || '''s Household')
    RETURNING id INTO new_household_id;

    -- Add user as owner of the household
    INSERT INTO household_members (household_id, user_id, email, role)
    VALUES (new_household_id, user_record.id, user_record.email, 'owner');

    RAISE NOTICE 'Created household % for user %', new_household_id, user_record.email;
  END LOOP;
END $$;

-- Step 2: Assign orphaned shows (no household_id) to the first household
-- This assumes you only have one user/household currently
DO $$
DECLARE
  first_household_id UUID;
  updated_count INTEGER;
BEGIN
  -- Get the first household (should be yours)
  SELECT id INTO first_household_id FROM households ORDER BY created_at ASC LIMIT 1;

  IF first_household_id IS NOT NULL THEN
    -- Update all shows without a household_id
    UPDATE shows
    SET household_id = first_household_id
    WHERE household_id IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % shows to household %', updated_count, first_household_id;

    -- Update all recommendations without a household_id
    UPDATE recommendations
    SET household_id = first_household_id
    WHERE household_id IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Assigned % recommendations to household %', updated_count, first_household_id;
  ELSE
    RAISE NOTICE 'No households found - skipping show assignment';
  END IF;
END $$;

-- Step 3: Verify the migration
SELECT
  'Households' as table_name,
  COUNT(*) as count
FROM households
UNION ALL
SELECT
  'Household Members' as table_name,
  COUNT(*) as count
FROM household_members
UNION ALL
SELECT
  'Shows with household' as table_name,
  COUNT(*) as count
FROM shows WHERE household_id IS NOT NULL
UNION ALL
SELECT
  'Shows without household (orphaned)' as table_name,
  COUNT(*) as count
FROM shows WHERE household_id IS NULL
UNION ALL
SELECT
  'Recommendations with household' as table_name,
  COUNT(*) as count
FROM recommendations WHERE household_id IS NOT NULL;
