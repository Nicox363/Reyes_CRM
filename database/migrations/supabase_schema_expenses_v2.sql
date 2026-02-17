-- SUPPLIERS TABLE
create table if not exists suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  contact_info text,
  category text, -- 'Stock', 'Rent', 'Utilities', etc.
  notes text,
  created_at timestamptz default now()
);

-- RECURRING EXPENSES TABLE (Automatic generation)
create table if not exists recurring_expenses (
  id uuid default uuid_generate_v4() primary key,
  concept text not null,
  amount decimal(10, 2) not null,
  supplier_id uuid references suppliers(id),
  category text not null,
  day_of_month int not null default 1, -- Day to generate (1-31)
  active boolean default true,
  last_generated_date date, -- Track when it was last created to avoid duplicates
  created_at timestamptz default now()
);

-- Link Expenses to Suppliers
alter table expenses add column if not exists supplier_id uuid references suppliers(id);

-- RLS Policies
alter table suppliers enable row level security;
alter table recurring_expenses enable row level security;

-- Admin Only Policies
create policy "Suppliers viewable by admin only" on suppliers for select to authenticated using (is_admin());
create policy "Suppliers insertable by admin only" on suppliers for insert to authenticated with check (is_admin());
create policy "Suppliers updatable by admin only" on suppliers for update to authenticated using (is_admin());
create policy "Suppliers deletable by admin only" on suppliers for delete to authenticated using (is_admin());

create policy "Recurring expenses viewable by admin only" on recurring_expenses for select to authenticated using (is_admin());
create policy "Recurring expenses insertable by admin only" on recurring_expenses for insert to authenticated with check (is_admin());
create policy "Recurring expenses updatable by admin only" on recurring_expenses for update to authenticated using (is_admin());
create policy "Recurring expenses deletable by admin only" on recurring_expenses for delete to authenticated using (is_admin());
