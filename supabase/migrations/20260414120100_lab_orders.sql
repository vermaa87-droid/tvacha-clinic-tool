-- Phase 3 Task #2: Lab orders (external lab test ordering + result tracking).
-- Doctor IS the clinic — clinic_id is enforced to equal doctor_id.
-- visit_id references appointments (no visits table — "visit" == appointments row).

create table if not exists public.lab_orders (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid references public.appointments(id) on delete set null,
  prescription_id uuid references public.prescriptions(id) on delete set null,
  test_name text not null,
  test_category text not null default 'other'
    check (test_category in (
      'hematology',     -- CBC, ESR, platelets
      'biochemistry',   -- LFT, KFT, lipid, glucose, HbA1c
      'hormonal',       -- TSH, testosterone, DHT, DHEA-S
      'immunology',     -- ANA, ANCA, IgE
      'microbiology',   -- KOH, culture, Gram stain, fungal culture
      'histopathology', -- skin biopsy, DIF
      'serology',       -- VDRL, HIV, HBsAg, HCV
      'genetic',
      'imaging',
      'urinalysis',
      'other'
    )),
  tests jsonb not null default '[]'::jsonb,
  priority text not null default 'routine'
    check (priority in ('routine', 'urgent', 'stat')),
  clinical_notes text,
  reason text,
  fasting_required boolean not null default false,
  patient_instructions text,
  external_lab_name text,
  external_lab_phone text,
  status text not null default 'ordered'
    check (status in (
      'ordered',             -- just created
      'sample_collected',    -- lab took the sample
      'in_progress',         -- lab processing
      'results_available',   -- results received, pending doctor review
      'reviewed',            -- doctor has reviewed
      'cancelled'
    )),
  is_abnormal boolean,
  result_summary text,
  result_pdf_url text,
  result_values jsonb,
  doctor_review_notes text,
  ordered_at timestamptz not null default now(),
  sample_collected_at timestamptz,
  results_available_at timestamptz,
  reviewed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_orders_clinic_matches_doctor check (clinic_id = doctor_id),
  constraint lab_orders_timeline_sane check (
    (sample_collected_at is null or sample_collected_at >= ordered_at)
    and (results_available_at is null or sample_collected_at is null or results_available_at >= sample_collected_at)
    and (reviewed_at is null or results_available_at is null or reviewed_at >= results_available_at)
  )
);

create index if not exists lab_orders_doctor_ordered_idx on public.lab_orders (doctor_id, ordered_at desc);
create index if not exists lab_orders_doctor_status_idx on public.lab_orders (doctor_id, status);
create index if not exists lab_orders_patient_idx on public.lab_orders (patient_id, ordered_at desc);
create index if not exists lab_orders_visit_idx on public.lab_orders (visit_id);
create index if not exists lab_orders_prescription_idx on public.lab_orders (prescription_id) where prescription_id is not null;
create index if not exists lab_orders_doctor_pending_review_idx
  on public.lab_orders (doctor_id, results_available_at)
  where status = 'results_available';
create index if not exists lab_orders_doctor_abnormal_idx
  on public.lab_orders (doctor_id, is_abnormal)
  where is_abnormal = true;

alter table public.lab_orders enable row level security;

drop policy if exists "lab_orders_select_own" on public.lab_orders;
create policy "lab_orders_select_own"
  on public.lab_orders for select
  using (auth.uid() = doctor_id);

drop policy if exists "lab_orders_insert_own" on public.lab_orders;
create policy "lab_orders_insert_own"
  on public.lab_orders for insert
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "lab_orders_update_own" on public.lab_orders;
create policy "lab_orders_update_own"
  on public.lab_orders for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "lab_orders_delete_own" on public.lab_orders;
create policy "lab_orders_delete_own"
  on public.lab_orders for delete
  using (auth.uid() = doctor_id and status = 'ordered');

create or replace function public.touch_lab_orders_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists lab_orders_touch_updated_at on public.lab_orders;
create trigger lab_orders_touch_updated_at
  before update on public.lab_orders
  for each row execute function public.touch_lab_orders_updated_at();

-- Auto-stamp lifecycle timestamps when status transitions.
create or replace function public.lab_orders_stamp_lifecycle()
returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'sample_collected' and new.sample_collected_at is null then
      new.sample_collected_at := now();
    elsif new.status = 'results_available' and new.results_available_at is null then
      new.results_available_at := now();
    elsif new.status = 'reviewed' and new.reviewed_at is null then
      new.reviewed_at := now();
    elsif new.status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lab_orders_stamp_lifecycle on public.lab_orders;
create trigger lab_orders_stamp_lifecycle
  before update on public.lab_orders
  for each row execute function public.lab_orders_stamp_lifecycle();
