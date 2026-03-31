-- Public display names for shared project lists (readable by signed-in users).
-- Run in Supabase SQL Editor after 002_wedding_planner_layout_shares.sql.
-- Last updated: 2026-03

create table if not exists public.wedding_planner_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists wedding_planner_profiles_display_name_idx
  on public.wedding_planner_profiles (display_name);

alter table public.wedding_planner_profiles enable row level security;

-- Collaborators need to read others' display names for the shared UI.
create policy "Authenticated users can read profiles"
  on public.wedding_planner_profiles for select
  to authenticated
  using (true);

create policy "Users insert own profile"
  on public.wedding_planner_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own profile"
  on public.wedding_planner_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
