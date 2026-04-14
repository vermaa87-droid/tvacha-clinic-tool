-- Phase 2: Lesion markings for interactive body map.
-- position_x / position_y are raw SVG viewBox coordinates:
--   x: 0–200 (viewBox width), y: 0–500 (viewBox height).

create table if not exists public.lesion_markings (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.appointments(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  body_region text not null,
  body_view text not null check (body_view in ('front', 'back')),
  position_x float8 not null check (position_x >= 0),
  position_y float8 not null check (position_y >= 0),
  lesion_type text,
  size_mm numeric(6,2) check (size_mm is null or size_mm >= 0),
  color text,
  shape text,
  count integer check (count is null or count >= 1),
  notes text,
  clinical_photo_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesion_markings_patient_visit_idx
  on public.lesion_markings (patient_id, visit_id);

create index if not exists lesion_markings_doctor_idx
  on public.lesion_markings (doctor_id);

create index if not exists lesion_markings_patient_created_idx
  on public.lesion_markings (patient_id, created_at desc);

create index if not exists lesion_markings_visit_idx
  on public.lesion_markings (visit_id);

create index if not exists lesion_markings_photo_idx
  on public.lesion_markings (clinical_photo_id) where clinical_photo_id is not null;

alter table public.lesion_markings enable row level security;

drop policy if exists "lesion_markings_select_own" on public.lesion_markings;
create policy "lesion_markings_select_own"
  on public.lesion_markings for select
  using (auth.uid() = doctor_id);

drop policy if exists "lesion_markings_insert_own" on public.lesion_markings;
create policy "lesion_markings_insert_own"
  on public.lesion_markings for insert
  with check (auth.uid() = doctor_id);

drop policy if exists "lesion_markings_update_own" on public.lesion_markings;
create policy "lesion_markings_update_own"
  on public.lesion_markings for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "lesion_markings_delete_own" on public.lesion_markings;
create policy "lesion_markings_delete_own"
  on public.lesion_markings for delete
  using (auth.uid() = doctor_id);

create or replace function public.touch_lesion_markings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists lesion_markings_touch_updated_at on public.lesion_markings;
create trigger lesion_markings_touch_updated_at
  before update on public.lesion_markings
  for each row execute function public.touch_lesion_markings_updated_at();
