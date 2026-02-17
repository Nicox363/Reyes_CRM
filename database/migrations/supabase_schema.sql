-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist"; -- Required for EXCLUDE constraints

-- Create ENUMs
create type user_role as enum ('admin', 'staff');
create type appointment_status as enum ('pending', 'confirmed', 'cancelled', 'paid', 'no_show');

-- 1. PROFILES (Extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role user_role default 'staff',
  name text,
  color text, -- For calendar display
  created_at timestamptz default now()
);

-- 2. CABINS (Physical resources)
create table cabins (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- 3. SERVICES
create table services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  duration int not null, -- in minutes
  price decimal(10, 2) not null,
  category text,
  created_at timestamptz default now()
);

-- 4. CLIENTS (New logic for unified history)
create table clients (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  phone text,
  email text,
  notes text, -- Allergies, preferences
  created_at timestamptz default now()
);

-- 5. APPOINTMENTS
create table appointments (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status default 'pending',
  cabin_id uuid references cabins(id),
  staff_id uuid references profiles(id),
  client_id uuid references clients(id), -- Linked to Clients table
  notes text,
  
  constraint appointments_duration_check check (end_time > start_time),

  -- CRITICAL: Prevent overlapping appointments in the same cabin
  exclude using gist (
    cabin_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status != 'cancelled')
);

-- 6. EXPENSES (Financials - SENSITIVE)
create table expenses (
  id uuid default uuid_generate_v4() primary key,
  concept text not null,
  amount decimal(10, 2) not null,
  date date not null default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ENABLE RLS
alter table profiles enable row level security;
alter table cabins enable row level security;
alter table services enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table expenses enable row level security;

-- RLS POLICIES

-- Helper function to check if user is admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- PROFILES
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- CABINS & SERVICES
create policy "Cabins viewable by authenticated" on cabins for select to authenticated using (true);
create policy "Cabins editable by admin" on cabins for all using (is_admin());

create policy "Services viewable by authenticated" on services for select to authenticated using (true);
create policy "Services editable by admin" on services for all using (is_admin());

-- CLIENTS
create policy "Clients viewable by authenticated" on clients for select to authenticated using (true);
create policy "Clients insertable by authenticated" on clients for insert to authenticated with check (true);
create policy "Clients updatable by authenticated" on clients for update to authenticated using (true);

-- APPOINTMENTS
create policy "Appointments viewable by authenticated" on appointments for select to authenticated using (true);
create policy "Appointments insertable by authenticated" on appointments for insert to authenticated with check (true);
create policy "Appointments updatable by authenticated" on appointments for update to authenticated using (true);
create policy "No one can delete appointments" on appointments for delete using (false);

-- EXPENSES: STRICTLY ADMIN ONLY
create policy "Expenses viewable by admin only" on expenses for select to authenticated using (is_admin());
create policy "Expenses insertable by admin only" on expenses for insert to authenticated with check (is_admin());
create policy "Expenses updatable by admin only" on expenses for update to authenticated using (is_admin());
create policy "Expenses deletable by admin only" on expenses for delete to authenticated using (is_admin());
