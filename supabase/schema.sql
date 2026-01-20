-- Show Tracker Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum types
create type show_status as enum ('to_watch', 'watching', 'watched');
create type show_type as enum ('movie', 'tv');
create type tag_category as enum ('who', 'genre', 'mood', 'meta');

-- Shows table
create table shows (
  id uuid primary key default uuid_generate_v4(),
  tmdb_id integer unique not null,
  title text not null,
  type show_type not null,
  poster_url text,
  year integer,
  overview text,
  status show_status not null default 'to_watch',
  imdb_rating decimal(3,1),
  rotten_tomatoes_score integer,
  imdb_id text,
  streaming_services jsonb default '[]'::jsonb,
  ai_summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tags table
create table tags (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  color text not null default '#6366f1',
  category tag_category not null default 'meta',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Show-Tags junction table
create table show_tags (
  show_id uuid references shows(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (show_id, tag_id)
);

-- Create indexes for performance
create index idx_shows_status on shows(status);
create index idx_shows_tmdb_id on shows(tmdb_id);
create index idx_shows_created_at on shows(created_at desc);
create index idx_tags_category on tags(category);
create index idx_show_tags_show_id on show_tags(show_id);
create index idx_show_tags_tag_id on show_tags(tag_id);

-- Auto-update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_shows_updated_at
  before update on shows
  for each row
  execute function update_updated_at_column();

-- Row Level Security (RLS)
-- For a shared household app with magic link auth, we allow authenticated users full access

alter table shows enable row level security;
alter table tags enable row level security;
alter table show_tags enable row level security;

-- Policies for authenticated users
create policy "Authenticated users can view shows" on shows
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert shows" on shows
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update shows" on shows
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete shows" on shows
  for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can view tags" on tags
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert tags" on tags
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update tags" on tags
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete tags" on tags
  for delete using (auth.role() = 'authenticated');

create policy "Authenticated users can view show_tags" on show_tags
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert show_tags" on show_tags
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete show_tags" on show_tags
  for delete using (auth.role() = 'authenticated');

-- Seed default tags
insert into tags (name, color, category) values
  -- Who (blue shades)
  ('Danny', '#3b82f6', 'who'),
  ('Elizabeth', '#60a5fa', 'who'),
  ('Both', '#2563eb', 'who'),
  ('Kids', '#93c5fd', 'who'),
  -- Genre (purple shades)
  ('Romcom', '#8b5cf6', 'genre'),
  ('Funny', '#a78bfa', 'genre'),
  ('Scifi', '#7c3aed', 'genre'),
  ('Drama', '#c4b5fd', 'genre'),
  ('Thriller', '#6d28d9', 'genre'),
  ('Documentary', '#ddd6fe', 'genre'),
  ('Action', '#5b21b6', 'genre'),
  ('Mystery', '#9333ea', 'genre'),
  -- Mood (green shades)
  ('Light', '#22c55e', 'mood'),
  ('Intense', '#16a34a', 'mood'),
  ('Feel-good', '#4ade80', 'mood'),
  -- Meta (orange shades)
  ('Recommended', '#f97316', 'meta'),
  ('Must-watch', '#ea580c', 'meta'),
  ('Liked', '#fb923c', 'meta');
