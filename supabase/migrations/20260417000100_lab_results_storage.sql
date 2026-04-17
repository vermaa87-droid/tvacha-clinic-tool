-- Storage bucket for lab result files (PDFs and images).
-- Path pattern: {patient_id}/{order_id}-{timestamp}.{ext}
-- Access: the owning doctor (via patients.linked_doctor_id) can read/write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lab-results',
  'lab-results',
  false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "lab_results_doctor_insert_own" on storage.objects;
create policy "lab_results_doctor_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lab-results'
    and exists (
      select 1 from public.patients p
      where p.id::text = split_part(name, '/', 1)
        and p.linked_doctor_id = auth.uid()
    )
  );

drop policy if exists "lab_results_doctor_select_own" on storage.objects;
create policy "lab_results_doctor_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lab-results'
    and exists (
      select 1 from public.patients p
      where p.id::text = split_part(name, '/', 1)
        and p.linked_doctor_id = auth.uid()
    )
  );

drop policy if exists "lab_results_doctor_delete_own" on storage.objects;
create policy "lab_results_doctor_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lab-results'
    and exists (
      select 1 from public.patients p
      where p.id::text = split_part(name, '/', 1)
        and p.linked_doctor_id = auth.uid()
    )
  );
