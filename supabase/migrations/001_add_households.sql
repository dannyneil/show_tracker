-- Migration: Add Households Support
-- This allows multiple users to share a household (e.g., family members)
-- while keeping separate households for different groups (e.g., friends)

-- Create households table
create table if not exists households (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'My Household',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create household_members table (links Supabase auth users to households)
create table if not exists household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(household_id, user_id),
  unique(user_id) -- Each user can only belong to one household
);

-- Create pending invitations table
create table if not exists household_invitations (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households(id) on delete cascade not null,
  email text not null,
  invited_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(household_id, email)
);

-- Add household_id to shows table
alter table shows add column if not exists household_id uuid references households(id) on delete cascade;

-- Add household_id to recommendations table
alter table recommendations add column if not exists household_id uuid references households(id) on delete cascade;

-- Drop the old unique constraint on tmdb_id (it should be unique per household, not globally)
alter table shows drop constraint if exists shows_tmdb_id_key;

-- Add new unique constraint: tmdb_id should be unique within a household
alter table shows add constraint shows_tmdb_id_household_unique unique (tmdb_id, household_id);

-- Create indexes
create index if not exists idx_household_members_user_id on household_members(user_id);
create index if not exists idx_household_members_household_id on household_members(household_id);
create index if not exists idx_shows_household_id on shows(household_id);
create index if not exists idx_recommendations_household_id on recommendations(household_id);
create index if not exists idx_household_invitations_email on household_invitations(email);

-- Helper function to get user's household_id
create or replace function get_user_household_id()
returns uuid as $$
  select household_id from household_members where user_id = auth.uid()
$$ language sql security definer stable;

-- Enable RLS on new tables
alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invitations enable row level security;

-- Drop old policies on shows
drop policy if exists "Authenticated users can view shows" on shows;
drop policy if exists "Authenticated users can insert shows" on shows;
drop policy if exists "Authenticated users can update shows" on shows;
drop policy if exists "Authenticated users can delete shows" on shows;

-- Drop old policies on recommendations
drop policy if exists "Authenticated users can view recommendations" on recommendations;
drop policy if exists "Authenticated users can insert recommendations" on recommendations;
drop policy if exists "Authenticated users can update recommendations" on recommendations;
drop policy if exists "Authenticated users can delete recommendations" on recommendations;

-- New RLS policies for households
create policy "Users can view their household" on households
  for select using (id = get_user_household_id());

create policy "Users can update their household" on households
  for update using (id = get_user_household_id());

-- Policies for household_members
create policy "Users can view their household members" on household_members
  for select using (household_id = get_user_household_id());

create policy "Owners can insert household members" on household_members
  for insert with check (
    household_id = get_user_household_id()
    and exists (
      select 1 from household_members
      where user_id = auth.uid()
      and role = 'owner'
    )
  );

create policy "Owners can delete household members" on household_members
  for delete using (
    household_id = get_user_household_id()
    and exists (
      select 1 from household_members
      where user_id = auth.uid()
      and role = 'owner'
    )
  );

-- Policies for invitations
create policy "Users can view invitations for their household" on household_invitations
  for select using (household_id = get_user_household_id());

create policy "Owners can create invitations" on household_invitations
  for insert with check (
    household_id = get_user_household_id()
    and exists (
      select 1 from household_members
      where user_id = auth.uid()
      and role = 'owner'
    )
  );

create policy "Owners can delete invitations" on household_invitations
  for delete using (
    household_id = get_user_household_id()
    and exists (
      select 1 from household_members
      where user_id = auth.uid()
      and role = 'owner'
    )
  );

-- New RLS policies for shows (household-based)
create policy "Users can view shows in their household" on shows
  for select using (household_id = get_user_household_id());

create policy "Users can insert shows in their household" on shows
  for insert with check (household_id = get_user_household_id());

create policy "Users can update shows in their household" on shows
  for update using (household_id = get_user_household_id());

create policy "Users can delete shows in their household" on shows
  for delete using (household_id = get_user_household_id());

-- New RLS policies for recommendations (household-based)
create policy "Users can view recommendations in their household" on recommendations
  for select using (household_id = get_user_household_id());

create policy "Users can insert recommendations in their household" on recommendations
  for insert with check (household_id = get_user_household_id());

create policy "Users can update recommendations in their household" on recommendations
  for update using (household_id = get_user_household_id());

create policy "Users can delete recommendations in their household" on recommendations
  for delete using (household_id = get_user_household_id());

-- Function to create a household for new users (called on first login)
create or replace function handle_new_user_household()
returns trigger as $$
declare
  new_household_id uuid;
  pending_invite record;
begin
  -- Check if this user has a pending invitation
  select * into pending_invite
  from household_invitations
  where email = new.email
  limit 1;

  if pending_invite is not null then
    -- Add user to existing household from invitation
    insert into household_members (household_id, user_id, email, role)
    values (pending_invite.household_id, new.id, new.email, 'member');

    -- Delete the invitation
    delete from household_invitations where id = pending_invite.id;
  else
    -- Create new household for this user
    insert into households (name)
    values (split_part(new.email, '@', 1) || '''s Household')
    returning id into new_household_id;

    -- Add user as owner of the household
    insert into household_members (household_id, user_id, email, role)
    values (new_household_id, new.id, new.email, 'owner');
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new users
drop trigger if exists on_auth_user_created_household on auth.users;
create trigger on_auth_user_created_household
  after insert on auth.users
  for each row execute function handle_new_user_household();
