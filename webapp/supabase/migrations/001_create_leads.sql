-- TeamDX Leads - use teamdx_leads (MCP applied to connected project)
-- Original migration kept for reference; actual schema in teamdx_leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  source text default '',
  name text default '',
  place text default '',
  number text default '',
  flow text default 'Select' check (flow in ('Select', 'Connected', 'Not Connected')),
  tags text default '',
  callback_time timestamptz,
  assigned_to text not null,
  category text default 'active' check (category in ('active', 'callback', 'overdue')),
  is_invalid boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Profiles for role (telecaller/admin)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text default 'telecaller' check (role in ('telecaller', 'admin'))
);

-- RLS
alter table public.leads enable row level security;

-- Telecaller: only own leads, not invalid
create policy "Telecaller own leads"
  on public.leads for select
  using (
    assigned_to = auth.jwt()->>'email'
    and is_invalid = false
  );

-- Telecaller: update own leads
create policy "Telecaller update own"
  on public.leads for update
  using (assigned_to = auth.jwt()->>'email');

-- Admin: see all leads (including invalid)
create policy "Admin select all"
  on public.leads for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Allow insert (admin or self-assign)
create policy "Insert leads"
  on public.leads for insert
  with check (true);

-- Index for assigned_to filter
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_is_invalid_idx on public.leads(is_invalid);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'telecaller');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
