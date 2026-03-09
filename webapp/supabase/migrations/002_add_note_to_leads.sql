-- Add note column for WhatsApp flow (Incoming Off - kiya baat hui)
alter table public.leads add column if not exists note text default '';
