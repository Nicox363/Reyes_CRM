-- 6. INVENTORY (Products)
create table if not exists inventory (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  stock_quantity int default 0,
  min_stock_threshold int default 2, -- Low stock alert
  price decimal(10, 2), -- Sale price
  cost decimal(10, 2), -- Purchase cost (for profit calc)
  created_at timestamptz default now()
);

-- Payment Method Enum
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bizum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. TRANSACTIONS (POS/Caja)
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  date timestamptz default now(),
  amount decimal(10, 2) not null,
  method payment_method not null,
  concept text, -- e.g. "Service: Manicure" or "Product: Cream"
  appointment_id uuid references appointments(id),
  client_id uuid references clients(id),
  created_by uuid references profiles(id)
);

-- 8. EXPENSES (Financials - SENSITIVE)
create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  concept text not null,
  amount decimal(10, 2) not null,
  date date not null default current_date,
  category text, -- 'Rent', 'Utilities', 'Payroll', 'Stock'
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ENABLE RLS
alter table inventory enable row level security;
alter table transactions enable row level security;
alter table expenses enable row level security;

-- DROP EXISTING POLICIES TO AVOID CONFLICTS
drop policy if exists "Inventory viewable by authenticated" on inventory;
drop policy if exists "Inventory editable by admin" on inventory;
drop policy if exists "Inventory updatable by staff" on inventory;

drop policy if exists "Transactions viewable by admin" on transactions;
drop policy if exists "Transactions viewable by creator" on transactions;
drop policy if exists "Transactions insertable by authenticated" on transactions;

drop policy if exists "Expenses viewable by admin only" on expenses;
drop policy if exists "Expenses insertable by admin only" on expenses;
drop policy if exists "Expenses updatable by admin only" on expenses;
drop policy if exists "Expenses deletable by admin only" on expenses;


-- RLS POLICIES

-- INVENTORY
create policy "Inventory viewable by authenticated" on inventory for select to authenticated using (true);
create policy "Inventory editable by admin" on inventory for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Inventory updatable by staff" on inventory for update using (true);

-- TRANSACTIONS
create policy "Transactions viewable by admin" on transactions for select to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Transactions viewable by creator" on transactions for select to authenticated using (auth.uid() = created_by);
create policy "Transactions insertable by authenticated" on transactions for insert to authenticated with check (true);

-- EXPENSES
create policy "Expenses viewable by admin only" on expenses for select to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Expenses insertable by admin only" on expenses for insert to authenticated with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Expenses updatable by admin only" on expenses for update to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Expenses deletable by admin only" on expenses for delete to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
