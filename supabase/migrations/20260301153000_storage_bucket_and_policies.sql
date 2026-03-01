insert into storage.buckets (id, name, public)
values ('relay-images', 'relay-images', true)
on conflict (id) do update
set public = true;

drop policy if exists relay_images_public_read on storage.objects;
create policy relay_images_public_read on storage.objects
for select to public
using (bucket_id = 'relay-images');

drop policy if exists relay_images_auth_insert on storage.objects;
create policy relay_images_auth_insert on storage.objects
for insert to authenticated
with check (
    bucket_id = 'relay-images'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists relay_images_auth_update on storage.objects;
create policy relay_images_auth_update on storage.objects
for update to authenticated
using (
    bucket_id = 'relay-images'
    and owner_id::text = auth.uid()::text
)
with check (
    bucket_id = 'relay-images'
    and owner_id::text = auth.uid()::text
);

drop policy if exists relay_images_auth_delete on storage.objects;
create policy relay_images_auth_delete on storage.objects
for delete to authenticated
using (
    bucket_id = 'relay-images'
    and owner_id::text = auth.uid()::text
);
