-- WhatsApp No Reply: 1hr followup, 2-day limit
alter table public.leads add column if not exists whatsapp_followup_started_at timestamptz;
