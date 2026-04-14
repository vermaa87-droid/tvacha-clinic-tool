-- Phase 1: Follow-up protocols (per-doctor configurable schedule + defaults)
-- Also adds follow_up_visit_id link to appointments for chained follow-ups.

create table if not exists public.follow_up_protocols (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  condition_name text not null,
  interval_days integer not null check (interval_days > 0),
  max_sessions integer,
  requires_labs boolean not null default false,
  lab_instructions text,
  notes text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists follow_up_protocols_doctor_idx
  on public.follow_up_protocols (doctor_id);

create index if not exists follow_up_protocols_doctor_condition_idx
  on public.follow_up_protocols (doctor_id, lower(condition_name));

create unique index if not exists follow_up_protocols_doctor_condition_unique
  on public.follow_up_protocols (doctor_id, lower(condition_name));

alter table public.follow_up_protocols enable row level security;

drop policy if exists "follow_up_protocols_select_own" on public.follow_up_protocols;
create policy "follow_up_protocols_select_own"
  on public.follow_up_protocols for select
  using (auth.uid() = doctor_id);

drop policy if exists "follow_up_protocols_insert_own" on public.follow_up_protocols;
create policy "follow_up_protocols_insert_own"
  on public.follow_up_protocols for insert
  with check (auth.uid() = doctor_id);

drop policy if exists "follow_up_protocols_update_own" on public.follow_up_protocols;
create policy "follow_up_protocols_update_own"
  on public.follow_up_protocols for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "follow_up_protocols_delete_own" on public.follow_up_protocols;
create policy "follow_up_protocols_delete_own"
  on public.follow_up_protocols for delete
  using (auth.uid() = doctor_id);

-- Appointments: link follow-up appointment to its originating visit (or prior appointment).
alter table public.appointments
  add column if not exists follow_up_visit_id uuid references public.appointments(id) on delete set null;

create index if not exists appointments_follow_up_visit_idx
  on public.appointments (follow_up_visit_id);

-- Seed defaults per doctor via trigger on signup AND via function usable for backfill.
create or replace function public.seed_default_follow_up_protocols(target_doctor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.follow_up_protocols
    (doctor_id, condition_name, interval_days, max_sessions, requires_labs, lab_instructions, notes, is_default)
  values
    (target_doctor, 'Acne (Oral)',        28, 6,  false, null,                                     'Review response to oral therapy; titrate doxycycline/isotretinoin.', true),
    (target_doctor, 'Isotretinoin',       30, 8,  true,  'LFT + Lipid profile + Beta-hCG (females) monthly', 'Cumulative dose tracking; pregnancy prevention counseling.', true),
    (target_doctor, 'Psoriasis (Mild)',   30, 6,  false, null,                                     'Assess PASI; topical compliance check.', true),
    (target_doctor, 'Psoriasis (Moderate)', 14, 10, true,  'CBC, LFT, RFT before systemic therapy', 'MTX/Apremilast monitoring; PASI scoring.', true),
    (target_doctor, 'Fungal Infection',   21, 4,  false, null,                                     'Confirm KOH-negative before stopping; recurrence check.', true),
    (target_doctor, 'Melasma',            30, 6,  false, null,                                     'MASI scoring; sunscreen compliance; tapering triple combination.', true),
    (target_doctor, 'Laser Hair Removal', 35, 8,  false, null,                                     'Session spacing per anatomic region; hair cycle timing.', true),
    (target_doctor, 'Chemical Peel',      21, 6,  false, null,                                     'Interval 14-21 days; post-peel care review; escalate strength.', true),
    (target_doctor, 'PRP (Hair)',         28, 6,  true,  'CBC + platelet count at baseline',       'Trichoscopy at each session; photo documentation.', true),
    (target_doctor, 'NBUVB Phototherapy',  3, 30, false, null,                                     'Thrice-weekly sessions; dose escalation per MED.', true)
  on conflict (doctor_id, lower(condition_name)) do nothing;
end;
$$;

grant execute on function public.seed_default_follow_up_protocols(uuid) to authenticated;

-- Trigger: seed defaults when a new doctor row is inserted.
create or replace function public.handle_new_doctor_follow_up_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_follow_up_protocols(new.id);
  return new;
end;
$$;

drop trigger if exists doctors_seed_follow_up_protocols on public.doctors;
create trigger doctors_seed_follow_up_protocols
  after insert on public.doctors
  for each row execute function public.handle_new_doctor_follow_up_seed();

-- Backfill for existing doctors at migration time.
do $$
declare d record;
begin
  for d in select id from public.doctors loop
    perform public.seed_default_follow_up_protocols(d.id);
  end loop;
end $$;

-- Auto-update updated_at
create or replace function public.touch_follow_up_protocols_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists follow_up_protocols_touch_updated_at on public.follow_up_protocols;
create trigger follow_up_protocols_touch_updated_at
  before update on public.follow_up_protocols
  for each row execute function public.touch_follow_up_protocols_updated_at();
