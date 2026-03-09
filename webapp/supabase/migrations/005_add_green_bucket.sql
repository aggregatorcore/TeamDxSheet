-- Green bucket: leads with documents received
alter table public.leads add column if not exists is_document_received boolean default false;
