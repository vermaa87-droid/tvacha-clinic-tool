-- Phase 3 Task #3: Teleconsultation columns on appointments.
-- Adds Daily.co room URL + session timestamps + auto-computed duration trigger.
-- consultation_type enum extension: 'teleconsultation' is a permitted value for appointments.type.

alter table public.appointments
  add column if not exists is_teleconsult boolean not null default false,
  add column if not exists teleconsult_room_url text,
  add column if not exists teleconsult_room_name text,
  add column if not exists teleconsult_provider text default 'daily'
    check (teleconsult_provider is null or teleconsult_provider in ('daily', 'jitsi', 'agora', 'other')),
  add column if not exists teleconsult_started_at timestamptz,
  add column if not exists teleconsult_ended_at timestamptz,
  add column if not exists teleconsult_duration_seconds integer check (teleconsult_duration_seconds is null or teleconsult_duration_seconds >= 0),
  add column if not exists teleconsult_patient_joined_at timestamptz,
  add column if not exists teleconsult_doctor_joined_at timestamptz,
  add column if not exists teleconsult_recording_url text,
  add column if not exists teleconsult_notes text;

-- Timeline sanity check.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_teleconsult_times_sane'
  ) then
    alter table public.appointments
      add constraint appointments_teleconsult_times_sane
      check (
        teleconsult_ended_at is null
        or teleconsult_started_at is null
        or teleconsult_ended_at >= teleconsult_started_at
      );
  end if;
end $$;

create index if not exists appointments_doctor_teleconsult_idx
  on public.appointments (doctor_id, appointment_date)
  where is_teleconsult = true;

create index if not exists appointments_teleconsult_active_idx
  on public.appointments (doctor_id, teleconsult_started_at)
  where is_teleconsult = true and teleconsult_started_at is not null and teleconsult_ended_at is null;

-- Auto-compute duration when ended_at is set.
create or replace function public.appointments_compute_teleconsult_duration()
returns trigger
language plpgsql as $$
begin
  if new.teleconsult_ended_at is not null and new.teleconsult_started_at is not null then
    new.teleconsult_duration_seconds := extract(epoch from (new.teleconsult_ended_at - new.teleconsult_started_at))::integer;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_compute_teleconsult_duration on public.appointments;
create trigger appointments_compute_teleconsult_duration
  before insert or update on public.appointments
  for each row execute function public.appointments_compute_teleconsult_duration();
