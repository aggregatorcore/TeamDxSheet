-- Add status to profiles: active | exited
alter table public.profiles
  add column if not exists status text default 'active' check (status in ('active', 'exited'));
