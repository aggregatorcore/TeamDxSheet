-- Token system: unique 5-min slot per user per day; token = slot number for display
alter table public.leads add column if not exists token text;
