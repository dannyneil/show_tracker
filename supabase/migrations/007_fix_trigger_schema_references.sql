-- Fix trigger function to use explicit schema references
-- The auth trigger runs in auth schema context, so it needs public.table_name

create or replace function handle_new_user_household()
returns trigger as $$
declare
  new_household_id uuid;
  pending_invite record;
begin
  -- Log start
  raise log 'HOUSEHOLD_TRIGGER: Starting for user % (id: %)', new.email, new.id;

  -- Check if user already has a household (shouldn't happen, but safety check)
  if exists (select 1 from public.household_members where user_id = new.id) then
    raise log 'HOUSEHOLD_TRIGGER: User % already has household, skipping', new.email;
    return new;
  end if;

  -- Check if this user has a pending invitation
  select * into pending_invite
  from public.household_invitations
  where email = new.email
  limit 1;

  if pending_invite is not null then
    raise log 'HOUSEHOLD_TRIGGER: Found invitation for %, adding to household %', new.email, pending_invite.household_id;

    -- Add user to existing household from invitation
    insert into public.household_members (household_id, user_id, email, role)
    values (pending_invite.household_id, new.id, new.email, 'member');

    -- Delete the invitation
    delete from public.household_invitations where id = pending_invite.id;

    raise log 'HOUSEHOLD_TRIGGER: Successfully added % to existing household', new.email;
  else
    raise log 'HOUSEHOLD_TRIGGER: Creating new household for %', new.email;

    -- Create new household for this user
    insert into public.households (name)
    values (coalesce(split_part(new.email, '@', 1), 'My') || '''s Household')
    returning id into new_household_id;

    -- Add user as owner of the household
    insert into public.household_members (household_id, user_id, email, role)
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
