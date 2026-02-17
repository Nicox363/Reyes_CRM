-- Allow authenticated users to view profiles
-- This is necessary for the Schedule page to list staff members
create policy "Profiles viewable by authenticated" on profiles
  for select 
  to authenticated 
  using (true);
