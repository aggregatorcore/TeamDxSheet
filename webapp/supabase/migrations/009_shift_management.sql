-- Shift management: per-user shift time, week off, leaves (admin-controlled)

-- Extend profiles with shift fields (all optional)
alter table public.profiles
  add column if not exists shift_start_time time,
  add column if not exists shift_end_time time,
  add column if not exists week_off_days text default '';

-- user_leaves: one row per user per leave date
create table if not exists public.user_leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_date date not null,
  leave_type text,
  created_at timestamptz default now(),
  unique(user_id, leave_date)
);

create index if not exists user_leaves_user_id_idx on public.user_leaves(user_id);

alter table public.user_leaves enable row level security;

-- Admin: full access to user_leaves
create policy "Admin all user_leaves"
  on public.user_leaves for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- User: can select own leaves only (for future if we show leaves to user)
create policy "User select own leaves"
  on public.user_leaves for select
  using (user_id = auth.uid());
