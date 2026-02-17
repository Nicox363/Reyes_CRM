-- 1. Create the storage bucket for client photos
insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do nothing;

-- 2. Create policies for the 'client-photos' bucket
-- Note: We skip enabling RLS on storage.objects as it is usually enabled by default
-- and changing it requires superuser permissions in some postgres configurations.

-- ALLOW UPLOAD (INSERT) for authenticated users
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'client-photos' );

-- ALLOW VIEW (SELECT) for authenticated users
create policy "Allow authenticated selects"
on storage.objects for select
to authenticated
using ( bucket_id = 'client-photos' );

-- ALLOW DELETE for authenticated users
create policy "Allow authenticated deletes"
on storage.objects for delete
to authenticated
using ( bucket_id = 'client-photos' );
