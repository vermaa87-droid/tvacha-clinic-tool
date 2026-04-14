-- Phase 3 Task #4: Patient Portal — OTP auth linkage + strict isolation + appointment_requests.
--
-- BACKGROUND
-- Phase 1-2 policies assume `auth.uid()` IS a doctor. This migration introduces a SECOND
-- class of authenticated user: patients. All new patient policies are ADDITIVE — doctor
-- policies are left untouched.
--
-- PATIENT-ACCESSIBLE TABLES (SELECT only, scoped to patient_id = current_patient_id())
--   - appointments                 (own rows only)
--   - prescriptions                (own rows only)
--   - lab_orders                   (own rows only, only after status in ('results_available','reviewed'))
--   - clinical_photos              (own rows only AND patient_visible = true)
--   - consent_records              (own rows only)
--   - patient_packages             (own rows only)
--   - invoices                     (own rows only)
--   - patient_feedback             (own rows only)
--   - patients                     (ONLY their own row — never another patient's)
--   - appointment_requests         (own rows — INSERT + SELECT their own requests)
--
-- PATIENT-FORBIDDEN TABLES (no patient policy added — doctor-only)
--   inventory_items, inventory_batches, inventory_suppliers, stock_transactions,
--   purchase_orders, purchase_order_items, drug_reference, sms_log, clinic_settings,
--   consent_templates, package_templates, follow_up_protocols, cases, visits (n/a),
--   daily_tokens, earnings, messages (separate channel if ever needed),
--   package_sessions, lesion_markings, invoice_sequences, po_sequences.

-- ============================================================
-- patients.auth_user_id + helper function
-- ============================================================
alter table public.patients
  add column if not exists auth_user_id uuid unique;

create index if not exists patients_auth_user_id_idx on public.patients (auth_user_id) where auth_user_id is not null;
create index if not exists patients_linked_doctor_phone_idx on public.patients (linked_doctor_id, phone) where phone is not null;

-- Returns the patient id (from public.patients) that the current auth.uid() is linked to,
-- or NULL if the current user is not a patient (e.g. is a doctor or unauthenticated).
create or replace function public.current_patient_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.patients where auth_user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_patient_id() to authenticated, anon;

-- Atomic link RPC: called by patient-portal OTP handler AFTER Supabase Auth has verified
-- the phone. Rejects if zero or >1 matching patient rows — caller must surface this to
-- the patient ("no record found" / "multiple records, contact clinic"). Normalises phone
-- by stripping non-digits and comparing on suffix of last 10 digits (India) so that
-- "+91 98XXX XXXXX" and "98XXX-XXXXX" match the same patient row.
create or replace function public.link_patient_to_auth(
  p_phone text,
  p_auth_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_suffix text;
  v_match_count integer;
  v_patient_id uuid;
begin
  if p_phone is null or length(p_phone) = 0 then
    raise exception 'phone required';
  end if;
  if p_auth_user_id is null then
    raise exception 'auth_user_id required';
  end if;

  v_digits := regexp_replace(p_phone, '\D', '', 'g');
  if length(v_digits) < 10 then
    raise exception 'phone must contain at least 10 digits';
  end if;
  v_suffix := right(v_digits, 10);

  -- If this auth user is already linked, return the existing linkage (idempotent).
  select id into v_patient_id from public.patients where auth_user_id = p_auth_user_id limit 1;
  if v_patient_id is not null then
    return v_patient_id;
  end if;

  -- Count unlinked patients matching the phone suffix.
  select count(*) into v_match_count
  from public.patients
  where phone is not null
    and right(regexp_replace(phone, '\D', '', 'g'), 10) = v_suffix
    and auth_user_id is null;

  if v_match_count = 0 then
    raise exception 'no patient record matches this phone number' using errcode = 'P0002';
  elsif v_match_count > 1 then
    raise exception 'multiple patient records match this phone number; contact clinic' using errcode = 'P0003';
  end if;

  update public.patients
    set auth_user_id = p_auth_user_id,
        updated_at = now()
    where phone is not null
      and right(regexp_replace(phone, '\D', '', 'g'), 10) = v_suffix
      and auth_user_id is null
    returning id into v_patient_id;

  return v_patient_id;
end;
$$;

grant execute on function public.link_patient_to_auth(text, uuid) to authenticated;

-- ============================================================
-- clinical_photos.patient_visible flag (feature gate for portal visibility)
-- ============================================================
alter table public.clinical_photos
  add column if not exists patient_visible boolean not null default false;

create index if not exists clinical_photos_patient_visible_idx
  on public.clinical_photos (patient_id, patient_visible, taken_at desc)
  where patient_visible = true;

-- ============================================================
-- patients — ADDITIVE SELECT policy for self
-- ============================================================
drop policy if exists "patients_self_select" on public.patients;
create policy "patients_self_select"
  on public.patients for select
  using (auth_user_id = auth.uid());

-- Patients may update their own limited demographic fields via app-level validation;
-- schema permits update of own row but doctor policies remain the primary path.
drop policy if exists "patients_self_update" on public.patients;
create policy "patients_self_update"
  on public.patients for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ============================================================
-- Additive patient SELECT policies on existing tables
-- Each keyed on patient_id = public.current_patient_id()
-- Doctor policies are untouched.
-- ============================================================
drop policy if exists "appointments_patient_self_select" on public.appointments;
create policy "appointments_patient_self_select"
  on public.appointments for select
  using (patient_id = public.current_patient_id());

drop policy if exists "prescriptions_patient_self_select" on public.prescriptions;
create policy "prescriptions_patient_self_select"
  on public.prescriptions for select
  using (patient_id = public.current_patient_id());

drop policy if exists "lab_orders_patient_self_select" on public.lab_orders;
create policy "lab_orders_patient_self_select"
  on public.lab_orders for select
  using (
    patient_id = public.current_patient_id()
    and status in ('results_available', 'reviewed')
  );

drop policy if exists "clinical_photos_patient_self_select" on public.clinical_photos;
create policy "clinical_photos_patient_self_select"
  on public.clinical_photos for select
  using (
    patient_id = public.current_patient_id()
    and patient_visible = true
  );

drop policy if exists "consent_records_patient_self_select" on public.consent_records;
create policy "consent_records_patient_self_select"
  on public.consent_records for select
  using (patient_id = public.current_patient_id());

drop policy if exists "patient_packages_patient_self_select" on public.patient_packages;
create policy "patient_packages_patient_self_select"
  on public.patient_packages for select
  using (patient_id = public.current_patient_id());

drop policy if exists "invoices_patient_self_select" on public.invoices;
create policy "invoices_patient_self_select"
  on public.invoices for select
  using (patient_id = public.current_patient_id());

drop policy if exists "patient_feedback_patient_self_select" on public.patient_feedback;
create policy "patient_feedback_patient_self_select"
  on public.patient_feedback for select
  using (patient_id = public.current_patient_id());

-- ============================================================
-- appointment_requests — patient-initiated booking requests (doctor approves -> appointments)
-- ============================================================
create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  requested_date date not null,
  requested_time_slot text not null
    check (requested_time_slot in ('morning', 'afternoon', 'evening', 'any')),
  preferred_time time,
  reason text,
  chief_complaint text,
  is_teleconsult boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'cancelled', 'converted')),
  decline_reason text,
  converted_appointment_id uuid references public.appointments(id) on delete set null,
  contact_phone text,
  contact_name text,
  notes text,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_requests_clinic_matches_doctor check (clinic_id = doctor_id)
);

create index if not exists appointment_requests_doctor_status_idx
  on public.appointment_requests (doctor_id, status, requested_at desc);
create index if not exists appointment_requests_doctor_pending_idx
  on public.appointment_requests (doctor_id, requested_at desc)
  where status = 'pending';
create index if not exists appointment_requests_patient_idx
  on public.appointment_requests (patient_id, requested_at desc)
  where patient_id is not null;
create index if not exists appointment_requests_doctor_date_idx
  on public.appointment_requests (doctor_id, requested_date);

alter table public.appointment_requests enable row level security;

-- Doctor policies.
drop policy if exists "appointment_requests_doctor_select_own" on public.appointment_requests;
create policy "appointment_requests_doctor_select_own"
  on public.appointment_requests for select
  using (auth.uid() = doctor_id);

drop policy if exists "appointment_requests_doctor_update_own" on public.appointment_requests;
create policy "appointment_requests_doctor_update_own"
  on public.appointment_requests for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "appointment_requests_doctor_delete_own" on public.appointment_requests;
create policy "appointment_requests_doctor_delete_own"
  on public.appointment_requests for delete
  using (auth.uid() = doctor_id);

-- Patient policies — INSERT (create request) + SELECT own + UPDATE own (cancel only, validated app-side).
drop policy if exists "appointment_requests_patient_insert_self" on public.appointment_requests;
create policy "appointment_requests_patient_insert_self"
  on public.appointment_requests for insert
  with check (
    patient_id = public.current_patient_id()
    and clinic_id = doctor_id
  );

drop policy if exists "appointment_requests_patient_select_self" on public.appointment_requests;
create policy "appointment_requests_patient_select_self"
  on public.appointment_requests for select
  using (patient_id = public.current_patient_id());

drop policy if exists "appointment_requests_patient_update_self" on public.appointment_requests;
create policy "appointment_requests_patient_update_self"
  on public.appointment_requests for update
  using (patient_id = public.current_patient_id() and status = 'pending')
  with check (patient_id = public.current_patient_id() and status in ('pending', 'cancelled'));

create or replace function public.touch_appointment_requests_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists appointment_requests_touch_updated_at on public.appointment_requests;
create trigger appointment_requests_touch_updated_at
  before update on public.appointment_requests
  for each row execute function public.touch_appointment_requests_updated_at();
