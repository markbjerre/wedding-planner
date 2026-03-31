-- Run in Supabase SQL Editor (Dashboard → SQL → New query).
-- Last verified: 2026-03
-- After this, run 002_wedding_planner_layout_shares.sql for multi-user sharing.

create table if not exists public.wedding_planner_layouts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists wedding_planner_layouts_updated_at_idx
  on public.wedding_planner_layouts (updated_at desc);

alter table public.wedding_planner_layouts enable row level security;

create policy "Users can read own layout"
  on public.wedding_planner_layouts for select
  using (auth.uid() = user_id);

create policy "Users can insert own layout"
  on public.wedding_planner_layouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own layout"
  on public.wedding_planner_layouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
