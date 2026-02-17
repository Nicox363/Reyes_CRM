-- Create staff_schedules table
create table if not exists staff_schedules (
  id uuid default uuid_generate_v4() primary key,
  staff_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  is_working_day boolean default true,
  note text,
  created_at timestamptz default now(),
  unique(staff_id, date)
);

-- Enable RLS
alter table staff_schedules enable row level security;

-- Policies

-- Admin: Full Access (Select, Insert, Update, Delete)
create policy "Schedules manage by admin" on staff_schedules 
  for all 
  to authenticated 
   using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Staff: View Own
create policy "Schedules view own" on staff_schedules 
  for select 
  to authenticated 
  using (auth.uid() = staff_id);

-- Staff: Cannot edit own schedule (Usually schedules are set by management)
-- If staff SHOULD edit, we can add a policy here. For now, read-only for staff.
