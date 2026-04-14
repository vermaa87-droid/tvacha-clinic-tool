-- Phase 2: SMS reminders (log + MSG91 config) + clinic_settings (doctor-as-clinic config table).
-- Doctor IS the clinic — clinic_settings.clinic_id equals doctors.id (1:1).
-- This table will also hold GST fields added by task #6.

create table if not exists public.clinic_settings (
  clinic_id uuid primary key references public.doctors(id) on delete cascade,
  -- SMS / MSG91 configuration.
  -- NOTE: msg91_api_key is sensitive. Current storage is plain TEXT behind strict RLS.
  -- TODO: migrate to Supabase Vault (pgsodium/vault) once available in our project tier,
  -- and replace this column with a vault-secret reference.
  msg91_api_key text,
  sender_id text,
  dlt_entity_id text,
  sms_enabled boolean not null default false,
  sms_credits_remaining integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_settings_dlt_sender_required_if_enabled
    check (
      sms_enabled = false
      or (msg91_api_key is not null and sender_id is not null and dlt_entity_id is not null)
    )
);

alter table public.clinic_settings enable row level security;

drop policy if exists "clinic_settings_select_own" on public.clinic_settings;
create policy "clinic_settings_select_own"
  on public.clinic_settings for select
  using (auth.uid() = clinic_id);

drop policy if exists "clinic_settings_insert_own" on public.clinic_settings;
create policy "clinic_settings_insert_own"
  on public.clinic_settings for insert
  with check (auth.uid() = clinic_id);

drop policy if exists "clinic_settings_update_own" on public.clinic_settings;
create policy "clinic_settings_update_own"
  on public.clinic_settings for update
  using (auth.uid() = clinic_id)
  with check (auth.uid() = clinic_id);

drop policy if exists "clinic_settings_delete_own" on public.clinic_settings;
create policy "clinic_settings_delete_own"
  on public.clinic_settings for delete
  using (auth.uid() = clinic_id);

-- Auto-create an empty clinic_settings row for new doctors.
create or replace function public.handle_new_doctor_clinic_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clinic_settings (clinic_id)
  values (new.id)
  on conflict (clinic_id) do nothing;
  return new;
end;
$$;

drop trigger if exists doctors_seed_clinic_settings on public.doctors;
create trigger doctors_seed_clinic_settings
  after insert on public.doctors
  for each row execute function public.handle_new_doctor_clinic_settings();

-- Backfill for existing doctors.
insert into public.clinic_settings (clinic_id)
select id from public.doctors
on conflict (clinic_id) do nothing;

create or replace function public.touch_clinic_settings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists clinic_settings_touch_updated_at on public.clinic_settings;
create trigger clinic_settings_touch_updated_at
  before update on public.clinic_settings
  for each row execute function public.touch_clinic_settings_updated_at();

-- sms_log: every SMS attempt, queued → sent → delivered (or failed).
-- doctor_id is derived from clinic_id (doctor IS clinic).
create table if not exists public.sms_log (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  phone_number text not null,
  template_used text,
  message_content text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed')),
  provider_message_id text,
  error_message text,
  cost_inr numeric(8,4) default 0 check (cost_inr is null or cost_inr >= 0),
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sms_log_clinic_matches_doctor check (clinic_id = doctor_id)
);

-- Usage query index: WHERE clinic_id=? ORDER BY sent_at DESC.
create index if not exists sms_log_clinic_sent_idx
  on public.sms_log (clinic_id, sent_at desc);

create index if not exists sms_log_clinic_created_idx
  on public.sms_log (clinic_id, created_at desc);

create index if not exists sms_log_clinic_status_idx
  on public.sms_log (clinic_id, status);

create index if not exists sms_log_appointment_idx
  on public.sms_log (appointment_id);

create index if not exists sms_log_patient_idx
  on public.sms_log (patient_id);

create index if not exists sms_log_provider_msg_idx
  on public.sms_log (provider_message_id);

alter table public.sms_log enable row level security;

drop policy if exists "sms_log_select_own" on public.sms_log;
create policy "sms_log_select_own"
  on public.sms_log for select
  using (auth.uid() = doctor_id);

drop policy if exists "sms_log_insert_own" on public.sms_log;
create policy "sms_log_insert_own"
  on public.sms_log for insert
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "sms_log_update_own" on public.sms_log;
create policy "sms_log_update_own"
  on public.sms_log for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

-- No DELETE policy — SMS audit trail should not be removed.

-- appointments: reminder tracking.
alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;

create index if not exists appointments_reminder_sent_idx
  on public.appointments (doctor_id, reminder_sent_at)
  where reminder_sent_at is null;
