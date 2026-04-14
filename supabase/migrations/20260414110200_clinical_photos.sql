-- Phase 2: Clinical photos (before/after/during, dermoscopy, timeline).
-- Photos belong to a patient; optionally scoped to a visit (appointment) and/or package session.

create table if not exists public.clinical_photos (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  visit_id uuid references public.appointments(id) on delete set null,
  package_session_id uuid references public.package_sessions(id) on delete set null,
  photo_url text not null,
  photo_type text not null
    check (photo_type in ('before', 'during', 'after', 'clinical', 'dermoscopy')),
  body_region text,
  angle text not null default 'other'
    check (angle in ('front', 'left_profile', 'right_profile', 'top', 'close_up', 'other')),
  notes text,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists clinical_photos_patient_taken_idx
  on public.clinical_photos (patient_id, taken_at desc);

create index if not exists clinical_photos_doctor_taken_idx
  on public.clinical_photos (doctor_id, taken_at desc);

create index if not exists clinical_photos_visit_idx
  on public.clinical_photos (visit_id);

create index if not exists clinical_photos_session_idx
  on public.clinical_photos (package_session_id);

create index if not exists clinical_photos_patient_type_idx
  on public.clinical_photos (patient_id, photo_type, taken_at desc);

alter table public.clinical_photos enable row level security;

drop policy if exists "clinical_photos_select_own" on public.clinical_photos;
create policy "clinical_photos_select_own"
  on public.clinical_photos for select
  using (auth.uid() = doctor_id);

drop policy if exists "clinical_photos_insert_own" on public.clinical_photos;
create policy "clinical_photos_insert_own"
  on public.clinical_photos for insert
  with check (auth.uid() = doctor_id);

drop policy if exists "clinical_photos_update_own" on public.clinical_photos;
create policy "clinical_photos_update_own"
  on public.clinical_photos for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "clinical_photos_delete_own" on public.clinical_photos;
create policy "clinical_photos_delete_own"
  on public.clinical_photos for delete
  using (auth.uid() = doctor_id);
