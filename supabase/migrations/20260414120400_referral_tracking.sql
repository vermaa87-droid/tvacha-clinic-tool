-- Phase 3 Task #5: Referral tracking columns on patients.
-- Captures "How did you hear about us?" + patient-to-patient referral linkage
-- for word-of-mouth analytics.

alter table public.patients
  add column if not exists referral_source text
    check (referral_source is null or referral_source in (
      'existing_patient',   -- patient referral (referred_by_patient_id should be populated)
      'google',
      'instagram',
      'facebook',
      'youtube',
      'whatsapp',
      'friend_family',      -- non-patient word-of-mouth
      'another_doctor',     -- physician referral
      'walk_in',
      'hospital_camp',
      'other'
    )),
  add column if not exists referred_by_patient_id uuid references public.patients(id) on delete set null,
  add column if not exists referral_source_notes text;

-- No self-referral.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'patients_no_self_referral'
  ) then
    alter table public.patients
      add constraint patients_no_self_referral
      check (referred_by_patient_id is null or referred_by_patient_id <> id);
  end if;
end $$;

create index if not exists patients_referral_source_idx
  on public.patients (linked_doctor_id, referral_source)
  where referral_source is not null;

create index if not exists patients_referred_by_idx
  on public.patients (referred_by_patient_id)
  where referred_by_patient_id is not null;

-- Referral aggregation helper: counts per source for a doctor over a date range.
-- Used by analytics page. SECURITY INVOKER so RLS applies naturally.
create or replace function public.referral_source_breakdown(
  p_doctor_id uuid,
  p_from date default null,
  p_to date default null
)
returns table (
  source text,
  patient_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(referral_source, 'unknown') as source,
    count(*)::bigint as patient_count
  from public.patients
  where linked_doctor_id = p_doctor_id
    and (p_from is null or created_at::date >= p_from)
    and (p_to is null or created_at::date <= p_to)
  group by coalesce(referral_source, 'unknown')
  order by patient_count desc;
$$;

grant execute on function public.referral_source_breakdown(uuid, date, date) to authenticated;

-- Top referring patients (for loyalty / thank-you outreach).
create or replace function public.top_referring_patients(
  p_doctor_id uuid,
  p_limit integer default 10
)
returns table (
  referrer_id uuid,
  referrer_name text,
  referred_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id as referrer_id,
    r.name as referrer_name,
    count(*)::bigint as referred_count
  from public.patients p
  join public.patients r on r.id = p.referred_by_patient_id
  where p.linked_doctor_id = p_doctor_id
    and r.linked_doctor_id = p_doctor_id
  group by r.id, r.name
  order by referred_count desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.top_referring_patients(uuid, integer) to authenticated;
