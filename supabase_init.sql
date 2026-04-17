-- incidents table
create table incidents (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  severity text check (severity in ('critical','high','medium','low')),
  status text check (status in ('open','in_progress','resolved','auto_fixed')),
  title text,
  cve_id text,
  agent_assigned text,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  pr_url text,
  patch_confidence float,
  user_id uuid references auth.users(id)
);

-- agent_events table
create table agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_name text,
  event_type text,
  message text,
  incident_id uuid references incidents(id),
  created_at timestamptz default now()
);

-- enable RLS
alter table incidents enable row level security;
alter table agent_events enable row level security;

create policy "Users see own incidents" on incidents for all using (auth.uid() = user_id);
create policy "Users see own events" on agent_events for all using (
  incident_id in (select id from incidents where user_id = auth.uid())
);

-- Enable realtime features for the frontend
begin; 
  drop publication if exists supabase_realtime; 
  create publication supabase_realtime; 
commit;
alter publication supabase_realtime add table agent_events;
