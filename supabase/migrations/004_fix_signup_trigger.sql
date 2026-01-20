-- Fix the signup trigger to handle errors better
-- This ensures new users can sign up successfully

-- Drop and recreate the trigger function with better error handling
create or replace function handle_new_user_household()
returns trigger as $$
declare
  new_household_id uuid;
  pending_invite record;
begin
  -- Log that we're processing a new user
  raise notice 'Processing new user: %', new.email;

  -- Check if this user has a pending invitation
  select * into pending_invite
  from household_invitations
  where email = new.email
  limit 1;

  if pending_invite is not null then
    raise notice 'Found pending invitation for %', new.email;

    -- Add user to existing household from invitation
    insert into household_members (household_id, user_id, email, role)
    values (pending_invite.household_id, new.id, new.email, 'member');

    -- Delete the invitation
    delete from household_invitations where id = pending_invite.id;
  else
    raise notice 'Creating new household for %', new.email;

    -- Create new household for this user
    insert into households (name)
    values (coalesce(split_part(new.email, '@', 1), 'My') || '''s Household')
    returning id into new_household_id;

    -- Add user as owner of the household
    insert into household_members (household_id, user_id, email, role)
    values (new_household_id, new.id, new.email, 'owner');

    raise notice 'Created household % for user %', new_household_id, new.email;
  end if;

  return new;
exception
  when others then
    -- Log the error but don't block signup
    raise warning 'Error creating household for %: %', new.email, SQLERRM;
    -- Return new anyway to allow signup to succeed
    return new;
end;
$$ language plpgsql security definer;

-- Ensure the trigger exists and is properly configured
drop trigger if exists on_auth_user_created_household on auth.users;
create trigger on_auth_user_created_household
  after insert on auth.users
  for each row execute function handle_new_user_household();

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;
grant all on households to authenticated, anon;
grant all on household_members to authenticated, anon;
grant all on household_invitations to authenticated, anon;
