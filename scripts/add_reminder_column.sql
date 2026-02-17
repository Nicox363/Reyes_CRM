-- Add reminder_sent_at column to appointments table
ALTER TABLE appointments ADD COLUMN reminder_sent_at TIMESTAMPTZ;

-- Policy (optional depending on existing policies, but good practice to ensure)
-- Assuming existing policies cover update, no new policy needed for just a column add 
-- if RLS is row-based.
