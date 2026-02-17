-- Add staff_id to transactions to track who made the sale (or performed the service if direct)
alter table transactions add column staff_id uuid references profiles(id);

-- Also ensure client_id is present (it should be, but just in case for older schemas)
-- alter table transactions add column client_id uuid references clients(id);
