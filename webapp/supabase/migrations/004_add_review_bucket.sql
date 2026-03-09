-- Review bucket: leads that need review (e.g. Budget issue)
alter table public.leads add column if not exists is_in_review boolean default false;
