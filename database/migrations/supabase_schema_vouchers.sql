-- 9. VOUCHERS (Bonos)

-- 9a. Voucher Definitions (Types of packs available for sale)
create table if not exists voucher_definitions (
  id uuid default uuid_generate_v4() primary key,
  name text not null, -- "Bono 5 Sesiones Laser"
  sessions int not null, -- 5
  price decimal(10, 2) not null, -- 150.00
  service_id uuid references services(id), -- Linked to a specific service
  created_at timestamptz default now()
);

-- 9b. Client Vouchers (Purchased packs)
create table if not exists client_vouchers (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) not null,
  definition_id uuid references voucher_definitions(id) not null,
  sessions_total int not null,
  sessions_remaining int not null,
  purchase_date timestamptz default now(),
  expiry_date timestamptz, -- Optional expiry
  transaction_id uuid references transactions(id), -- Link to the purchase transaction
  created_at timestamptz default now()
);

-- Enable RLS for Vouchers
alter table voucher_definitions enable row level security;
alter table client_vouchers enable row level security;

-- Policies
create policy "Voucher Defs viewable by all" on voucher_definitions for select to authenticated using (true);
create policy "Voucher Defs editable by admin" on voucher_definitions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Client Vouchers viewable by staff" on client_vouchers for select to authenticated using (true);
create policy "Client Vouchers update by staff" on client_vouchers for update to authenticated using (true); -- To deduct sessions
create policy "Client Vouchers insert by staff" on client_vouchers for insert to authenticated with check (true);
