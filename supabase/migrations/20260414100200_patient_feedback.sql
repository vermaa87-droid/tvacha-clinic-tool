-- Phase 1: Patient feedback (public token-based submission).
-- visit_id maps to the completed appointment (no separate visits table in this schema).

create table if not exists public.patient_feedback (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.appointments(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  feedback_token text not null unique,
  rating smallint check (rating between 1 and 5),
  comment text,
  improvement_suggestion text,
  google_review_clicked boolean not null default false,
  submitted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists patient_feedback_doctor_idx
  on public.patient_feedback (doctor_id);

create index if not exists patient_feedback_doctor_submitted_idx
  on public.patient_feedback (doctor_id, submitted_at desc);

create index if not exists patient_feedback_doctor_created_idx
  on public.patient_feedback (doctor_id, created_at desc);

create index if not exists patient_feedback_visit_idx
  on public.patient_feedback (visit_id);

create index if not exists patient_feedback_token_idx
  on public.patient_feedback (feedback_token);

alter table public.patient_feedback enable row level security;

-- Doctor can read own feedback.
drop policy if exists "patient_feedback_select_own" on public.patient_feedback;
create policy "patient_feedback_select_own"
  on public.patient_feedback for select
  using (auth.uid() = doctor_id);

-- Doctor creates feedback rows (seeded with a token when a visit completes).
drop policy if exists "patient_feedback_insert_own" on public.patient_feedback;
create policy "patient_feedback_insert_own"
  on public.patient_feedback for insert
  with check (auth.uid() = doctor_id);

-- Anonymous public submission: update rating/comment/etc via token.
-- We model "submission" as an UPDATE from anon on a row whose token matches,
-- restricted to rows not yet submitted and not expired.
drop policy if exists "patient_feedback_public_submit" on public.patient_feedback;
create policy "patient_feedback_public_submit"
  on public.patient_feedback for update
  to anon
  using (
    submitted_at is null
    and expires_at > now()
  )
  with check (
    submitted_at is not null
    and expires_at > now()
  );

-- Token-scoped public read: allow anon to read ONLY the row matching a supplied token
-- (useful for /feedback/[token] page to render prefilled doctor/patient context).
-- Implemented by a SECURITY DEFINER RPC so we don't open SELECT to anon on the table.
create or replace function public.get_feedback_by_token(p_token text)
returns table (
  id uuid,
  doctor_id uuid,
  patient_id uuid,
  visit_id uuid,
  rating smallint,
  comment text,
  improvement_suggestion text,
  submitted_at timestamptz,
  expires_at timestamptz,
  doctor_name text,
  clinic_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.doctor_id, f.patient_id, f.visit_id, f.rating, f.comment,
         f.improvement_suggestion, f.submitted_at, f.expires_at,
         d.full_name as doctor_name, d.clinic_name
  from public.patient_feedback f
  join public.doctors d on d.id = f.doctor_id
  where f.feedback_token = p_token
    and f.expires_at > now();
$$;

grant execute on function public.get_feedback_by_token(text) to anon, authenticated;

-- Public submission RPC — atomic update by token with basic validation.
create or replace function public.submit_feedback_by_token(
  p_token text,
  p_rating smallint,
  p_comment text,
  p_improvement text,
  p_google_review_clicked boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  update public.patient_feedback
     set rating = p_rating,
         comment = p_comment,
         improvement_suggestion = p_improvement,
         google_review_clicked = coalesce(p_google_review_clicked, false),
         submitted_at = now()
   where feedback_token = p_token
     and submitted_at is null
     and expires_at > now()
  returning id into v_id;

  if v_id is null then
    raise exception 'invalid, expired, or already-submitted feedback token';
  end if;

  return v_id;
end;
$$;

grant execute on function public.submit_feedback_by_token(text, smallint, text, text, boolean)
  to anon, authenticated;
