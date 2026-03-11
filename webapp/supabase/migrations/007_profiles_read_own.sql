-- Ensure every user can read their own profile (for role check when SERVICE_ROLE_KEY is not used).
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);
