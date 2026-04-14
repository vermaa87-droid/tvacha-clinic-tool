-- Phase 2: Treatment packages (templates + patient packages + per-session tracking).
-- Doctor IS the clinic — clinic_id is enforced to equal doctor_id.
-- Seeds 10 common dermatology package templates per doctor via trigger + backfill.

create table if not exists public.package_templates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  name text not null,
  total_sessions integer not null check (total_sessions > 0),
  suggested_price numeric(10,2) not null check (suggested_price >= 0),
  session_interval_days integer not null check (session_interval_days > 0),
  validity_months integer not null default 12 check (validity_months > 0),
  notes text,
  equipment_needed text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_templates_clinic_matches_doctor check (clinic_id = doctor_id)
);

create index if not exists package_templates_doctor_idx
  on public.package_templates (doctor_id);

create index if not exists package_templates_doctor_active_idx
  on public.package_templates (doctor_id, is_active);

create unique index if not exists package_templates_doctor_name_unique
  on public.package_templates (doctor_id, lower(name));

alter table public.package_templates enable row level security;

drop policy if exists "package_templates_select_own" on public.package_templates;
create policy "package_templates_select_own"
  on public.package_templates for select
  using (auth.uid() = doctor_id);

drop policy if exists "package_templates_insert_own" on public.package_templates;
create policy "package_templates_insert_own"
  on public.package_templates for insert
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "package_templates_update_own" on public.package_templates;
create policy "package_templates_update_own"
  on public.package_templates for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "package_templates_delete_own" on public.package_templates;
create policy "package_templates_delete_own"
  on public.package_templates for delete
  using (auth.uid() = doctor_id);

-- Patient-assigned packages (a patient buying a 6-session LHR course, etc.)
create table if not exists public.patient_packages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  template_id uuid references public.package_templates(id) on delete set null,
  package_name text not null,
  total_sessions integer not null check (total_sessions > 0),
  sessions_completed integer not null default 0 check (sessions_completed >= 0),
  total_price numeric(10,2) not null check (total_price >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  start_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  expiry_date date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'expired', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_packages_sessions_bounded check (sessions_completed <= total_sessions),
  constraint patient_packages_expiry_after_start check (expiry_date >= start_date)
);

create index if not exists patient_packages_doctor_idx
  on public.patient_packages (doctor_id);

create index if not exists patient_packages_doctor_status_idx
  on public.patient_packages (doctor_id, status);

create index if not exists patient_packages_patient_idx
  on public.patient_packages (patient_id);

create index if not exists patient_packages_patient_status_idx
  on public.patient_packages (patient_id, status);

create index if not exists patient_packages_doctor_expiry_idx
  on public.patient_packages (doctor_id, expiry_date);

alter table public.patient_packages enable row level security;

drop policy if exists "patient_packages_select_own" on public.patient_packages;
create policy "patient_packages_select_own"
  on public.patient_packages for select
  using (auth.uid() = doctor_id);

drop policy if exists "patient_packages_insert_own" on public.patient_packages;
create policy "patient_packages_insert_own"
  on public.patient_packages for insert
  with check (auth.uid() = doctor_id);

drop policy if exists "patient_packages_update_own" on public.patient_packages;
create policy "patient_packages_update_own"
  on public.patient_packages for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "patient_packages_delete_own" on public.patient_packages;
create policy "patient_packages_delete_own"
  on public.patient_packages for delete
  using (auth.uid() = doctor_id);

-- Per-session rows for a patient_package (session 1 of 6, etc.)
create table if not exists public.package_sessions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.patient_packages(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  session_number integer not null check (session_number > 0),
  session_date date,
  appointment_id uuid references public.appointments(id) on delete set null,
  notes text,
  before_photo_url text,
  after_photo_url text,
  performed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists package_sessions_package_number_unique
  on public.package_sessions (package_id, session_number);

create index if not exists package_sessions_package_idx
  on public.package_sessions (package_id);

create index if not exists package_sessions_doctor_idx
  on public.package_sessions (doctor_id);

create index if not exists package_sessions_appointment_idx
  on public.package_sessions (appointment_id);

create index if not exists package_sessions_doctor_date_idx
  on public.package_sessions (doctor_id, session_date desc);

alter table public.package_sessions enable row level security;

drop policy if exists "package_sessions_select_own" on public.package_sessions;
create policy "package_sessions_select_own"
  on public.package_sessions for select
  using (auth.uid() = doctor_id);

drop policy if exists "package_sessions_insert_own" on public.package_sessions;
create policy "package_sessions_insert_own"
  on public.package_sessions for insert
  with check (auth.uid() = doctor_id);

drop policy if exists "package_sessions_update_own" on public.package_sessions;
create policy "package_sessions_update_own"
  on public.package_sessions for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "package_sessions_delete_own" on public.package_sessions;
create policy "package_sessions_delete_own"
  on public.package_sessions for delete
  using (auth.uid() = doctor_id);

-- Seed 10 dermatology package templates per doctor.
create or replace function public.seed_default_package_templates(target_doctor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.package_templates
    (doctor_id, clinic_id, name, total_sessions, suggested_price, session_interval_days, validity_months, notes, equipment_needed)
  values
    (target_doctor, target_doctor, 'Laser Hair Removal - Full Face',    8, 24000.00, 30, 12, 'Diode/Alexandrite laser; 6-8 week spacing per hair cycle.', 'Diode or Alexandrite laser'),
    (target_doctor, target_doctor, 'Laser Hair Removal - Underarms',    6, 12000.00, 35, 12, 'Test patch at session 1; sun avoidance post-session.',     'Diode or Alexandrite laser'),
    (target_doctor, target_doctor, 'Chemical Peel - Glycolic',          6,  9000.00, 21, 9,  '30-50% glycolic; review between sessions; escalate %.',     'Glycolic acid 30-50%'),
    (target_doctor, target_doctor, 'Chemical Peel - TCA',               4, 16000.00, 28, 9,  '15-20% TCA for pigmentation; frost endpoint; downtime 5-7d.', 'TCA 15-20%'),
    (target_doctor, target_doctor, 'PRP - Hair',                        6, 18000.00, 28, 9,  'Trichoscopy + photo at each session; CBC + platelets baseline.', 'PRP kit, centrifuge'),
    (target_doctor, target_doctor, 'PRP - Face',                        4, 16000.00, 28, 9,  'Combine with microneedling for scar remodeling.',           'PRP kit, centrifuge'),
    (target_doctor, target_doctor, 'Microneedling',                     4, 14000.00, 28, 9,  '1.5-2mm for scars; topical anesthesia 30 min pre-procedure.', 'Dermapen/derma stamp'),
    (target_doctor, target_doctor, 'Carbon Peel',                       4, 12000.00, 21, 9,  'Q-switched Nd:YAG; oily skin / open-pore focus.',           'Q-switched Nd:YAG laser'),
    (target_doctor, target_doctor, 'NBUVB Phototherapy',               30, 30000.00,  3, 6,  'Thrice weekly; dose escalation per MED; eye protection.',   'NBUVB cabin'),
    (target_doctor, target_doctor, 'Derma Roller',                      6,  9000.00, 28, 9,  '1.0-1.5mm home/clinic roller; avoid active acne zones.',    'Derma roller 1.0-1.5mm')
  on conflict (doctor_id, lower(name)) do nothing;
end;
$$;

grant execute on function public.seed_default_package_templates(uuid) to authenticated;

create or replace function public.handle_new_doctor_package_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_package_templates(new.id);
  return new;
end;
$$;

drop trigger if exists doctors_seed_package_templates on public.doctors;
create trigger doctors_seed_package_templates
  after insert on public.doctors
  for each row execute function public.handle_new_doctor_package_seed();

-- Backfill for existing doctors.
do $$
declare d record;
begin
  for d in select id from public.doctors loop
    perform public.seed_default_package_templates(d.id);
  end loop;
end $$;

-- updated_at triggers
create or replace function public.touch_package_templates_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists package_templates_touch_updated_at on public.package_templates;
create trigger package_templates_touch_updated_at
  before update on public.package_templates
  for each row execute function public.touch_package_templates_updated_at();

create or replace function public.touch_patient_packages_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists patient_packages_touch_updated_at on public.patient_packages;
create trigger patient_packages_touch_updated_at
  before update on public.patient_packages
  for each row execute function public.touch_patient_packages_updated_at();

create or replace function public.touch_package_sessions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists package_sessions_touch_updated_at on public.package_sessions;
create trigger package_sessions_touch_updated_at
  before update on public.package_sessions
  for each row execute function public.touch_package_sessions_updated_at();
