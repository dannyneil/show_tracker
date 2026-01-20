-- Backfill households for users who signed up before the household trigger was in place
-- This fixes "new row violates row-level security policy" errors

DO $$
DECLARE
  user_record RECORD;
  new_household_id uuid;
BEGIN
  -- Find all users without a household
  FOR user_record IN
    SELECT u.id, u.email
    FROM auth.users u
    LEFT JOIN household_members hm ON hm.user_id = u.id
    WHERE hm.household_id IS NULL
  LOOP
    RAISE NOTICE 'Creating household for user: %', user_record.email;

    -- Create a household for this user
    INSERT INTO households (name)
    VALUES (coalesce(split_part(user_record.email, '@', 1), 'My') || '''s Household')
    RETURNING id INTO new_household_id;

    -- Add user as owner
    INSERT INTO household_members (household_id, user_id, email, role)
    VALUES (new_household_id, user_record.id, user_record.email, 'owner');

    RAISE NOTICE 'Created household % for user %', new_household_id, user_record.email;
  END LOOP;
END $$;

-- Update any orphaned shows to belong to the first household
-- (This handles shows that were created before the household system)
DO $$
DECLARE
  first_household_id uuid;
  orphaned_count integer;
BEGIN
  -- Get the first household (typically the admin's)
  SELECT id INTO first_household_id
  FROM households
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_household_id IS NOT NULL THEN
    -- Update shows without a household
    UPDATE shows
    SET household_id = first_household_id
    WHERE household_id IS NULL;

    GET DIAGNOSTICS orphaned_count = ROW_COUNT;

    IF orphaned_count > 0 THEN
      RAISE NOTICE 'Assigned % orphaned shows to household %', orphaned_count, first_household_id;
    END IF;
  END IF;
END $$;

-- Verify all users now have households
SELECT
  COUNT(*) as users_without_households
FROM auth.users u
LEFT JOIN household_members hm ON hm.user_id = u.id
WHERE hm.household_id IS NULL;
