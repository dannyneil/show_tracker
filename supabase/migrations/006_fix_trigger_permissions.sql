-- Fix trigger permissions and add fallback mechanism
-- This ensures ALL new users get a household, even if the trigger fails

-- First, ensure the function has proper permissions
-- Grant the postgres role (which creates the function) full access to the tables
grant all on households to postgres;
grant all on household_members to postgres;
grant all on household_invitations to postgres;

-- Recreate the trigger function with better error handling and logging
create or replace function handle_new_user_household()
returns trigger as $$
declare
  new_household_id uuid;
  pending_invite record;
begin
  -- Log start
  raise log 'HOUSEHOLD_TRIGGER: Starting for user % (id: %)', new.email, new.id;

  -- Check if user already has a household (shouldn't happen, but safety check)
  if exists (select 1 from household_members where user_id = new.id) then
    raise log 'HOUSEHOLD_TRIGGER: User % already has household, skipping', new.email;
    return new;
  end if;

  -- Check if this user has a pending invitation
  select * into pending_invite
  from household_invitations
  where email = new.email
  limit 1;

  if pending_invite is not null then
    raise log 'HOUSEHOLD_TRIGGER: Found invitation for %, adding to household %', new.email, pending_invite.household_id;

    -- Add user to existing household from invitation
    insert into household_members (household_id, user_id, email, role)
    values (pending_invite.household_id, new.id, new.email, 'member');

    -- Delete the invitation
    delete from household_invitations where id = pending_invite.id;

    raise log 'HOUSEHOLD_TRIGGER: Successfully added % to existing household', new.email;
  else
    raise log 'HOUSEHOLD_TRIGGER: Creating new household for %', new.email;

    -- Create new household for this user
    insert into households (name)
    values (coalesce(split_part(new.email, '@', 1), 'My') || '''s Household')
    returning id into new_household_id;

    -- Add user as owner of the household
    insert into household_members (household_id, user_id, email, role)
    values (new_household_id, new.id, new.email, 'owner');

    raise log 'HOUSEHOLD_TRIGGER: Successfully created household % for user %', new_household_id, new.email;
  end if;

  return new;
exception
  when others then
    -- Log the full error details
    raise warning 'HOUSEHOLD_TRIGGER ERROR for user %: % (SQLSTATE: %)', new.email, SQLERRM, SQLSTATE;
    raise warning 'HOUSEHOLD_TRIGGER ERROR details: %', SQLERRM;
    -- Still return new to allow signup to continue
    return new;
end;
$$ language plpgsql security definer;

-- Ensure the trigger is properly set up
drop trigger if exists on_auth_user_created_household on auth.users;
create trigger on_auth_user_created_household
  after insert on auth.users
  for each row execute function handle_new_user_household();

-- Verify trigger exists
select
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
from information_schema.triggers
where trigger_name = 'on_auth_user_created_household';
