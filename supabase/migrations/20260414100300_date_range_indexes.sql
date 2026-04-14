-- Phase 1: Composite indexes to keep CSV/PDF exports fast over date ranges.
-- All export queries are RLS-scoped by doctor_id (or linked_doctor_id for patients),
-- so compound indexes (doctor/linked_doctor, date desc) cover the common shape:
--   WHERE <doctor filter> AND <date> BETWEEN ? AND ? ORDER BY <date> DESC.
--
-- Uses IF NOT EXISTS so this migration is safe to replay. Each index is created
-- only when the referenced column exists, to handle environments where a
-- particular column (e.g. visits.visit_date) may not have been provisioned yet.

-- patients: exported by (linked_doctor_id, created_at)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='patients' and column_name='linked_doctor_id'
  ) then
    create index if not exists patients_linked_doctor_created_idx
      on public.patients (linked_doctor_id, created_at desc);
  end if;
end $$;

-- cases: exported by (assigned_doctor_id, created_at) and (patient_id, created_at)
do $$ begin
  if to_regclass('public.cases') is not null then
    create index if not exists cases_assigned_doctor_created_idx
      on public.cases (assigned_doctor_id, created_at desc);
    create index if not exists cases_patient_created_idx
      on public.cases (patient_id, created_at desc);
  end if;
end $$;

-- prescriptions: exported by (doctor_id, created_at) and (patient_id, created_at)
do $$ begin
  if to_regclass('public.prescriptions') is not null then
    create index if not exists prescriptions_doctor_created_idx
      on public.prescriptions (doctor_id, created_at desc);
    create index if not exists prescriptions_patient_created_idx
      on public.prescriptions (patient_id, created_at desc);
  end if;
end $$;

-- appointments: exported by (doctor_id, appointment_date)
do $$ begin
  if to_regclass('public.appointments') is not null then
    create index if not exists appointments_doctor_date_idx
      on public.appointments (doctor_id, appointment_date desc);
    create index if not exists appointments_doctor_status_date_idx
      on public.appointments (doctor_id, status, appointment_date desc);
    create index if not exists appointments_patient_date_idx
      on public.appointments (patient_id, appointment_date desc);
  end if;
end $$;

-- patient_fees: analytics + register page pull by (doctor_id, created_at)
do $$ begin
  if to_regclass('public.patient_fees') is not null then
    create index if not exists patient_fees_doctor_created_idx
      on public.patient_fees (doctor_id, created_at desc);
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='patient_fees' and column_name='status'
    ) then
      create index if not exists patient_fees_doctor_status_created_idx
        on public.patient_fees (doctor_id, status, created_at desc);
    end if;
  end if;
end $$;

-- visits: register page queries visits by (patient_id, visit_date)
do $$ begin
  if to_regclass('public.visits') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='visits' and column_name='visit_date'
    ) then
      create index if not exists visits_patient_date_idx
        on public.visits (patient_id, visit_date desc);
      if exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='visits' and column_name='doctor_id'
      ) then
        create index if not exists visits_doctor_date_idx
          on public.visits (doctor_id, visit_date desc);
      end if;
    end if;
  end if;
end $$;

-- earnings: analytics / export by (doctor_id, created_at)
do $$ begin
  if to_regclass('public.earnings') is not null then
    create index if not exists earnings_doctor_created_idx
      on public.earnings (doctor_id, created_at desc);
  end if;
end $$;
