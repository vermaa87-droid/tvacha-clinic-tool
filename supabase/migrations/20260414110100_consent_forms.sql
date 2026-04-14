-- Phase 2: Consent forms (editable templates + IMMUTABLE signed records + storage bucket).
-- consent_records is write-once: RLS exposes only SELECT + INSERT; no UPDATE or DELETE policies.
-- Storage bucket `consents` holds signed PDFs under `{patient_id}/{consent_id}.pdf`.

-- Editable per-doctor consent templates.
create table if not exists public.consent_templates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  title text not null,
  procedure_type text not null,
  body_text text not null,
  checkboxes jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consent_templates_doctor_idx
  on public.consent_templates (doctor_id);

create index if not exists consent_templates_doctor_active_idx
  on public.consent_templates (doctor_id, is_active);

create unique index if not exists consent_templates_doctor_title_unique
  on public.consent_templates (doctor_id, lower(title));

alter table public.consent_templates enable row level security;

drop policy if exists "consent_templates_select_own" on public.consent_templates;
create policy "consent_templates_select_own"
  on public.consent_templates for select
  using (auth.uid() = doctor_id);

drop policy if exists "consent_templates_insert_own" on public.consent_templates;
create policy "consent_templates_insert_own"
  on public.consent_templates for insert
  with check (auth.uid() = doctor_id);

drop policy if exists "consent_templates_update_own" on public.consent_templates;
create policy "consent_templates_update_own"
  on public.consent_templates for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

drop policy if exists "consent_templates_delete_own" on public.consent_templates;
create policy "consent_templates_delete_own"
  on public.consent_templates for delete
  using (auth.uid() = doctor_id);

-- IMMUTABLE signed consent records.
-- Deliberately NO update/delete RLS policies → with RLS on, all UPDATE/DELETE are blocked.
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.consent_templates(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete restrict,
  visit_id uuid references public.appointments(id) on delete set null,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  procedure_name text not null,
  consent_text text not null,
  checkboxes_checked jsonb not null default '[]'::jsonb,
  signature_url text,
  pdf_url text,
  patient_ip text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists consent_records_doctor_idx
  on public.consent_records (doctor_id);

create index if not exists consent_records_patient_idx
  on public.consent_records (patient_id);

create index if not exists consent_records_doctor_signed_idx
  on public.consent_records (doctor_id, signed_at desc);

create index if not exists consent_records_patient_signed_idx
  on public.consent_records (patient_id, signed_at desc);

create index if not exists consent_records_visit_idx
  on public.consent_records (visit_id);

alter table public.consent_records enable row level security;

-- Only SELECT and INSERT policies — UPDATE/DELETE are blocked (no policy → RLS denies).
drop policy if exists "consent_records_select_own" on public.consent_records;
create policy "consent_records_select_own"
  on public.consent_records for select
  using (auth.uid() = doctor_id);

drop policy if exists "consent_records_insert_own" on public.consent_records;
create policy "consent_records_insert_own"
  on public.consent_records for insert
  with check (auth.uid() = doctor_id);

-- Defense-in-depth: row-level triggers that raise on UPDATE/DELETE so even a
-- service-role accidental call fails loudly. Superusers bypass RLS; triggers fire always.
create or replace function public.block_consent_records_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'consent_records are immutable and cannot be % after insert', tg_op;
end;
$$;

drop trigger if exists consent_records_block_update on public.consent_records;
create trigger consent_records_block_update
  before update on public.consent_records
  for each row execute function public.block_consent_records_mutation();

drop trigger if exists consent_records_block_delete on public.consent_records;
create trigger consent_records_block_delete
  before delete on public.consent_records
  for each row execute function public.block_consent_records_mutation();

-- Seed 7 default consent templates per doctor.
create or replace function public.seed_default_consent_templates(target_doctor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.consent_templates (doctor_id, title, procedure_type, body_text, checkboxes)
  values
    (
      target_doctor, 'Laser Treatment Consent', 'laser',
      'I consent to undergo laser treatment (hair removal / pigmentation / scar / tattoo) as explained to me. I understand the procedure involves application of a focused light beam and may cause temporary redness, swelling, pigmentation changes, blistering, or scarring in rare cases. Results vary by skin type, hair cycle, and number of sessions. Multiple sessions are typically required.',
      '[
        {"key":"risks_explained","label":"Risks, alternatives, and expected outcomes have been explained to me."},
        {"key":"photos","label":"I consent to clinical photography for medical records."},
        {"key":"sun_avoidance","label":"I will avoid sun exposure and follow post-care instructions."},
        {"key":"no_guarantee","label":"I understand no specific result is guaranteed."}
      ]'::jsonb
    ),
    (
      target_doctor, 'Chemical Peel Consent', 'chemical_peel',
      'I consent to chemical peel treatment using glycolic / salicylic / TCA or similar agents. I understand the procedure may cause stinging, redness, peeling, temporary hyperpigmentation or hypopigmentation, and in rare cases scarring or infection. Downtime and results depend on peel depth and skin type.',
      '[
        {"key":"risks_explained","label":"Risks, downtime, and aftercare have been explained."},
        {"key":"sunscreen","label":"I will use sunscreen and avoid direct sun exposure."},
        {"key":"no_active_acne","label":"I have disclosed active skin infections / isotretinoin use."},
        {"key":"photos","label":"I consent to clinical photography."}
      ]'::jsonb
    ),
    (
      target_doctor, 'Botox / Dermal Filler Consent', 'injectables',
      'I consent to injection of botulinum toxin / hyaluronic acid filler for cosmetic correction. I understand risks including bruising, swelling, asymmetry, infection, vascular occlusion, allergic reaction, and the need for touch-ups. Effects are temporary and repeat treatments may be required.',
      '[
        {"key":"risks_explained","label":"Risks including vascular events have been explained."},
        {"key":"no_pregnancy","label":"I confirm I am not pregnant or breastfeeding."},
        {"key":"disclosed_meds","label":"I have disclosed current medications and allergies."},
        {"key":"photos","label":"I consent to clinical photography."}
      ]'::jsonb
    ),
    (
      target_doctor, 'PRP Therapy Consent', 'prp',
      'I consent to Platelet-Rich Plasma (PRP) therapy for hair / skin rejuvenation. Autologous blood will be drawn, centrifuged, and re-injected. I understand risks include pain, bruising, temporary swelling, infection, and variable results. Multiple sessions are typically required.',
      '[
        {"key":"risks_explained","label":"Risks and session schedule have been explained."},
        {"key":"baseline_labs","label":"I consent to baseline CBC + platelet testing if required."},
        {"key":"no_guarantee","label":"I understand results vary and are not guaranteed."},
        {"key":"photos","label":"I consent to clinical photography."}
      ]'::jsonb
    ),
    (
      target_doctor, 'Skin Biopsy Consent', 'biopsy',
      'I consent to a skin biopsy (punch / shave / excisional) for histopathological diagnosis. I understand the procedure involves local anesthesia, removal of a small skin sample, and will leave a small scar. Risks include bleeding, infection, and scarring. Histopathology report typically takes 5-10 days.',
      '[
        {"key":"risks_explained","label":"Risks including scar and infection have been explained."},
        {"key":"anesthesia","label":"I consent to local anesthesia."},
        {"key":"histopath","label":"I consent to sending the sample for histopathology."},
        {"key":"photos","label":"I consent to clinical photography."}
      ]'::jsonb
    ),
    (
      target_doctor, 'Microneedling Consent', 'microneedling',
      'I consent to microneedling treatment using dermapen / derma roller for scars, pigmentation, or skin rejuvenation. I understand the procedure causes controlled micro-injury to stimulate collagen. Expected side effects include redness, pinpoint bleeding, and peeling for 2-5 days. Rare risks: infection, post-inflammatory hyperpigmentation.',
      '[
        {"key":"risks_explained","label":"Risks and downtime have been explained."},
        {"key":"no_active_infection","label":"I have no active skin infection in treatment area."},
        {"key":"sunscreen","label":"I will use sunscreen and avoid sun exposure post-procedure."},
        {"key":"photos","label":"I consent to clinical photography."}
      ]'::jsonb
    ),
    (
      target_doctor, 'General Dermatology Consent', 'general',
      'I consent to examination, investigation, and treatment by the treating dermatologist. I understand that the diagnosis may require clinical examination, dermoscopy, KOH/microscopy, biopsy, or blood tests. I agree to follow the prescribed treatment plan and attend follow-up visits as advised.',
      '[
        {"key":"info_disclosed","label":"I have disclosed all relevant medical history and medications."},
        {"key":"follow_up","label":"I agree to attend follow-up visits as advised."},
        {"key":"photos","label":"I consent to clinical photography for medical records."},
        {"key":"data_privacy","label":"I have read and understood the privacy policy."}
      ]'::jsonb
    )
  on conflict (doctor_id, lower(title)) do nothing;
end;
$$;

grant execute on function public.seed_default_consent_templates(uuid) to authenticated;

create or replace function public.handle_new_doctor_consent_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_consent_templates(new.id);
  return new;
end;
$$;

drop trigger if exists doctors_seed_consent_templates on public.doctors;
create trigger doctors_seed_consent_templates
  after insert on public.doctors
  for each row execute function public.handle_new_doctor_consent_seed();

-- Backfill existing doctors.
do $$
declare d record;
begin
  for d in select id from public.doctors loop
    perform public.seed_default_consent_templates(d.id);
  end loop;
end $$;

-- updated_at trigger for consent_templates.
create or replace function public.touch_consent_templates_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists consent_templates_touch_updated_at on public.consent_templates;
create trigger consent_templates_touch_updated_at
  before update on public.consent_templates
  for each row execute function public.touch_consent_templates_updated_at();

-- Supabase Storage bucket `consents` for signed PDFs.
-- Path pattern: {patient_id}/{consent_id}.pdf
-- Access: the owning doctor (via linked_doctor_id on patient) can read/write; nobody else.
insert into storage.buckets (id, name, public)
values ('consents', 'consents', false)
on conflict (id) do nothing;

drop policy if exists "consents_doctor_read_own" on storage.objects;
create policy "consents_doctor_read_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'consents'
    and exists (
      select 1 from public.patients p
      where p.id::text = split_part(name, '/', 1)
        and p.linked_doctor_id = auth.uid()
    )
  );

drop policy if exists "consents_doctor_insert_own" on storage.objects;
create policy "consents_doctor_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'consents'
    and exists (
      select 1 from public.patients p
      where p.id::text = split_part(name, '/', 1)
        and p.linked_doctor_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policy on storage.objects for `consents` — signed PDFs are immutable.
