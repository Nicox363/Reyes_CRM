-- Update the 'client-photos' bucket to be public
-- This allows getPublicUrl() to work as intended in the frontend
update storage.buckets
set public = true
where id = 'client-photos';

-- Ensure the policy allows public select (viewing)
-- We previously added "Allow authenticated selects", but for public buckets 
-- we technically might want public access or at least ensure the authenticated access works simply.
-- Actually, keep the policies, but opening the bucket 'public' flag is the key for getPublicUrl to not return 403.
