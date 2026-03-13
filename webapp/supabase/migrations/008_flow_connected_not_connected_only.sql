-- Global rule: only 2 flows – Connected, Not Connected. Remove "Select", default Not Connected.
-- For existing DBs that had flow default 'Select' or check including 'Select'.

-- Update any legacy 'Select' or invalid flow to 'Not Connected'
update public.leads set flow = 'Not Connected' where flow is null or flow not in ('Connected', 'Not Connected');

-- Drop existing flow check (constraint name from create table)
alter table public.leads drop constraint if exists leads_flow_check;

-- Enforce only Connected | Not Connected
alter table public.leads add constraint leads_flow_check check (flow in ('Connected', 'Not Connected'));

-- Default for new rows
alter table public.leads alter column flow set default 'Not Connected';
