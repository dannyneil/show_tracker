-- Migration: Make "Who" tags household-specific
-- Genre, Mood, and Meta tags remain global (shared by all)
-- "Who" tags (Danny, Elizabeth, Both, Kids) are private to each household

-- Step 1: Add household_id column to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES households(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_tags_household_id ON tags(household_id);

-- Step 3: Drop old RLS policies on tags
DROP POLICY IF EXISTS "Authenticated users can view tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can insert tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can update tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can delete tags" ON tags;

-- Step 4: Create new RLS policies for tags
-- Users can see global tags (null household_id) OR their own household's tags
CREATE POLICY "Users can view global and household tags" ON tags
  FOR SELECT USING (
    household_id IS NULL
    OR household_id = get_user_household_id()
  );

-- Users can only insert tags for their own household (not global tags)
CREATE POLICY "Users can insert household tags" ON tags
  FOR INSERT WITH CHECK (
    household_id = get_user_household_id()
  );

-- Users can only update their own household's tags (not global tags)
CREATE POLICY "Users can update household tags" ON tags
  FOR UPDATE USING (
    household_id = get_user_household_id()
  );

-- Users can only delete their own household's tags (not global tags)
CREATE POLICY "Users can delete household tags" ON tags
  FOR DELETE USING (
    household_id = get_user_household_id()
  );

-- Step 5: Migrate existing "Who" tags to the first household (your household)
-- This preserves Danny, Elizabeth, Both, Kids for your household
DO $$
DECLARE
  first_household_id uuid;
  migrated_count integer;
BEGIN
  -- Get the first household (should be yours)
  SELECT id INTO first_household_id FROM households ORDER BY created_at ASC LIMIT 1;

  IF first_household_id IS NOT NULL THEN
    -- Assign existing "Who" tags to your household
    UPDATE tags
    SET household_id = first_household_id
    WHERE category = 'who' AND household_id IS NULL;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % Who tags to household %', migrated_count, first_household_id;
  ELSE
    RAISE NOTICE 'No households found - Who tags remain global';
  END IF;
END $$;

-- Step 6: Function to create default "Who" tags for NEW households
CREATE OR REPLACE FUNCTION create_household_who_tags(p_household_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO tags (name, color, category, household_id) VALUES
    ('Person 1', '#3b82f6', 'who', p_household_id),
    ('Person 2', '#60a5fa', 'who', p_household_id),
    ('Both', '#2563eb', 'who', p_household_id),
    ('Kids', '#93c5fd', 'who', p_household_id)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Update the new user trigger to also create default tags
CREATE OR REPLACE FUNCTION handle_new_user_household()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id uuid;
  pending_invite RECORD;
BEGIN
  -- Check if this user has a pending invitation
  SELECT * INTO pending_invite
  FROM household_invitations
  WHERE email = NEW.email
  LIMIT 1;

  IF pending_invite IS NOT NULL THEN
    -- Add user to existing household from invitation
    INSERT INTO household_members (household_id, user_id, email, role)
    VALUES (pending_invite.household_id, NEW.id, NEW.email, 'member');

    -- Delete the invitation
    DELETE FROM household_invitations WHERE id = pending_invite.id;
  ELSE
    -- Create new household for this user
    INSERT INTO households (name)
    VALUES (split_part(NEW.email, '@', 1) || '''s Household')
    RETURNING id INTO new_household_id;

    -- Add user as owner of the household
    INSERT INTO household_members (household_id, user_id, email, role)
    VALUES (new_household_id, NEW.id, NEW.email, 'owner');

    -- Create default "Who" tags for this household
    PERFORM create_household_who_tags(new_household_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Update unique constraint on tags
-- Name should be unique within a household OR globally (for null household_id)
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS tags_name_household_unique
  ON tags (name, COALESCE(household_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Step 10: Verify the migration
SELECT
  'Global tags' as type,
  COUNT(*) as count
FROM tags WHERE household_id IS NULL
UNION ALL
SELECT
  'Household-specific tags' as type,
  COUNT(*) as count
FROM tags WHERE household_id IS NOT NULL;
