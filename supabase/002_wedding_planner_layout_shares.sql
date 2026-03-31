-- Layout sharing: collaborators can read/edit the owner's floor plan row.
-- Run in Supabase SQL Editor after 001_wedding_planner_layouts.sql.
-- Last updated: 2026-03

-- ─── Shares (who can access whose layout) ───────────────────────────────────
create table if not exists public.wedding_planner_layout_shares (
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  shared_with_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_user_id, shared_with_user_id)
);

create index if not exists wedding_planner_layout_shares_shared_idx
  on public.wedding_planner_layout_shares (shared_with_user_id);

alter table public.wedding_planner_layout_shares enable row level security;

create policy "See layout shares"
  on public.wedding_planner_layout_shares for select
  using (auth.uid() = owner_user_id or auth.uid() = shared_with_user_id);

create policy "Remove layout share"
  on public.wedding_planner_layout_shares for delete
  using (auth.uid() = owner_user_id or auth.uid() = shared_with_user_id);

-- Inserts only via SECURITY DEFINER RPC (accept invite).

-- ─── One-time invite codes ──────────────────────────────────────────────────
create table if not exists public.wedding_planner_share_invites (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists wedding_planner_share_invites_owner_idx
  on public.wedding_planner_share_invites (owner_user_id);

alter table public.wedding_planner_share_invites enable row level security;

create policy "Owner sees own invites"
  on public.wedding_planner_share_invites for select
  using (auth.uid() = owner_user_id);

create policy "Owner deletes own invites"
  on public.wedding_planner_share_invites for delete
  using (auth.uid() = owner_user_id);

-- ─── Replace layout row policies (own + collaborator access) ────────────────
drop policy if exists "Users can read own layout" on public.wedding_planner_layouts;
drop policy if exists "Users can insert own layout" on public.wedding_planner_layouts;
drop policy if exists "Users can update own layout" on public.wedding_planner_layouts;

create policy "Users can read own or shared layout"
  on public.wedding_planner_layouts for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.wedding_planner_layout_shares s
      where s.owner_user_id = wedding_planner_layouts.user_id
        and s.shared_with_user_id = auth.uid()
    )
  );

create policy "Users can insert own layout"
  on public.wedding_planner_layouts for insert
  with check (auth.uid() = user_id);

create policy "Owner or collaborator can update layout"
  on public.wedding_planner_layouts for update
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.wedding_planner_layout_shares s
      where s.owner_user_id = wedding_planner_layouts.user_id
        and s.shared_with_user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.wedding_planner_layout_shares s
      where s.owner_user_id = wedding_planner_layouts.user_id
        and s.shared_with_user_id = auth.uid()
    )
  );

-- ─── RPC: create invite code (owner) ────────────────────────────────────────
create or replace function public.create_wedding_planner_share_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
  insert into public.wedding_planner_share_invites (owner_user_id, code, expires_at)
  values (auth.uid(), v_code, now() + interval '7 days');
  return v_code;
end;
$$;

-- ─── RPC: redeem invite (collaborator) ──────────────────────────────────────
create or replace function public.accept_wedding_planner_share_invite(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.wedding_planner_share_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select * into v_inv
  from public.wedding_planner_share_invites
  where code = upper(trim(p_code))
    and expires_at > now()
  limit 1;
  if v_inv.id is null then
    raise exception 'Invalid or expired invite code';
  end if;
  if v_inv.owner_user_id = auth.uid() then
    raise exception 'Cannot redeem your own invite';
  end if;
  insert into public.wedding_planner_layout_shares (owner_user_id, shared_with_user_id)
  values (v_inv.owner_user_id, auth.uid())
  on conflict (owner_user_id, shared_with_user_id) do nothing;
  delete from public.wedding_planner_share_invites where id = v_inv.id;
end;
$$;

grant execute on function public.create_wedding_planner_share_invite() to authenticated;
grant execute on function public.accept_wedding_planner_share_invite(text) to authenticated;
