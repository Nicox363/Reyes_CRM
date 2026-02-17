-- Add CRM columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS is_conflictive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients';
