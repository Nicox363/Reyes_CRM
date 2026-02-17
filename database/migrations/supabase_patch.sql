-- Add service_id to appointments table
alter table appointments 
add column service_id uuid references services(id);
