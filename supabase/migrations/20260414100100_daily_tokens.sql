-- Phase 1: Walk-in token queue (same-day tokens per clinic/doctor).
-- In Tvacha, a doctor IS the clinic — so doctor_id functions as clinic_id.
-- We keep both columns for forward compatibility; they must match.

create table if not exists public.daily_tokens (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  token_number integer not null,
  token_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  walk_in_name text,
  walk_in_phone text,
  chief_complaint text,
  status text not null default 'waiting'
    check (status in ('waiting', 'in_consultation', 'done', 'no_show')),
  called_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint daily_tokens_clinic_matches_doctor check (clinic_id = doctor_id),
  constraint daily_tokens_patient_or_walkin check (
    patient_id is not null or walk_in_name is not null
  )
);

create unique index if not exists daily_tokens_unique_number
  on public.daily_tokens (clinic_id, token_date, token_number);

create index if not exists daily_tokens_doctor_date_idx
  on public.daily_tokens (doctor_id, token_date);

create index if not exists daily_tokens_doctor_date_status_idx
  on public.daily_tokens (doctor_id, token_date, status);

create index if not exists daily_tokens_patient_idx
  on public.daily_tokens (patient_id);

alter table public.daily_tokens enable row level security;

drop policy if exists "daily_tokens_select_own" on public.daily_tokens;
create policy "daily_tokens_select_own"
  on public.daily_tokens for select
  using (auth.uid() = doctor_id);

drop policy if exists "daily_tokens_insert_own" on public.daily_tokens;
create policy "daily_tokens_insert_own"
  on public.daily_tokens for insert
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "daily_tokens_update_own" on public.daily_tokens;
create policy "daily_tokens_update_own"
  on public.daily_tokens for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "daily_tokens_delete_own" on public.daily_tokens;
create policy "daily_tokens_delete_own"
  on public.daily_tokens for delete
  using (auth.uid() = doctor_id);

-- Public QR check-in: allow anonymous INSERT when clinic_id matches a real doctor row.
-- Walk-ins created this way have status='waiting', patient_id=null, and must supply walk_in_name.
drop policy if exists "daily_tokens_public_checkin_insert" on public.daily_tokens;
create policy "daily_tokens_public_checkin_insert"
  on public.daily_tokens for insert
  to anon
  with check (
    clinic_id = doctor_id
    and patient_id is null
    and walk_in_name is not null
    and status = 'waiting'
    and token_date = (now() at time zone 'Asia/Kolkata')::date
    and exists (select 1 from public.doctors d where d.id = clinic_id)
  );

-- Next token number helper (safe under concurrency; inserts serialize on the unique index).
create or replace function public.next_daily_token_number(p_clinic_id uuid, p_date date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(token_number), 0) + 1
  from public.daily_tokens
  where clinic_id = p_clinic_id and token_date = p_date;
$$;

grant execute on function public.next_daily_token_number(uuid, date) to authenticated, anon;

-- Enable Supabase Realtime on the table.
alter publication supabase_realtime add table public.daily_tokens;
