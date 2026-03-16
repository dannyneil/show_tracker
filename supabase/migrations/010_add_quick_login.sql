-- Migration: Add Quick Login Support
-- Allows households to set up a memorable URL + passphrase for quick access
-- Useful for devices where email access is difficult (e.g., work computers)

-- Add quick login fields to households table
alter table households add column if not exists quick_login_slug text unique;
alter table households add column if not exists quick_login_passphrase_hash text;

-- Create index for quick lookups by slug
create index if not exists idx_households_quick_login_slug on households(quick_login_slug);

-- Create table to track quick login attempts for rate limiting and security
create table if not exists quick_login_attempts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null,
  ip_address text,
  success boolean not null default false,
  attempted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for rate limiting queries
create index if not exists idx_quick_login_attempts_slug_time on quick_login_attempts(slug, attempted_at desc);
create index if not exists idx_quick_login_attempts_ip_time on quick_login_attempts(ip_address, attempted_at desc);

-- Enable RLS on quick_login_attempts (only system can write)
alter table quick_login_attempts enable row level security;

-- No user policies for quick_login_attempts - only server can write
-- This prevents users from seeing failed login attempts

-- Function to clean up old attempts (keep last 30 days)
create or replace function cleanup_old_quick_login_attempts()
returns void as $$
  delete from quick_login_attempts
  where attempted_at < now() - interval '30 days';
$$ language sql security definer;
