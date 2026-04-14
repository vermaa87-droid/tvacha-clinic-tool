-- Phase 2: GST invoices.
-- Per-doctor, per-fiscal-year sequential numbering: `TC/{FY}/0001` e.g. TC/2025-26/0001.
-- Doctor IS the clinic, so clinic_id is enforced to equal doctor_id.

-- GST / legal fields on doctors.
alter table public.doctors
  add column if not exists gstin text,
  add column if not exists legal_business_name text,
  add column if not exists state_code text;

-- GSTIN format check: 15 chars — 2 state + 5 alpha + 4 digit + 1 alpha + 1 entity + 'Z' + 1 checksum.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'doctors_gstin_format_chk'
  ) then
    alter table public.doctors
      add constraint doctors_gstin_format_chk
      check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');
  end if;
end $$;

-- state_code is a 2-char Indian state code (01..37) or 2-letter ISO-style.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'doctors_state_code_format_chk'
  ) then
    alter table public.doctors
      add constraint doctors_state_code_format_chk
      check (state_code is null or state_code ~ '^[0-9A-Z]{2}$');
  end if;
end $$;

-- Invoices.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  visit_id uuid references public.appointments(id) on delete set null,
  invoice_number text not null,
  fiscal_year text not null,
  invoice_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  cgst_amount numeric(12,2) not null default 0 check (cgst_amount >= 0),
  sgst_amount numeric(12,2) not null default 0 check (sgst_amount >= 0),
  igst_amount numeric(12,2) not null default 0 check (igst_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  place_of_supply text,
  pdf_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_clinic_matches_doctor check (clinic_id = doctor_id),
  constraint invoices_place_of_supply_format
    check (place_of_supply is null or place_of_supply ~ '^[0-9A-Z]{2}$'),
  constraint invoices_intra_or_inter_state
    check (
      -- Either intra-state (cgst + sgst, no igst) or inter-state (igst only, no cgst/sgst).
      (igst_amount = 0 and cgst_amount >= 0 and sgst_amount >= 0)
      or (igst_amount > 0 and cgst_amount = 0 and sgst_amount = 0)
    )
);

create unique index if not exists invoices_doctor_number_unique
  on public.invoices (doctor_id, invoice_number);

create index if not exists invoices_doctor_date_idx
  on public.invoices (doctor_id, invoice_date desc);

create index if not exists invoices_doctor_fy_idx
  on public.invoices (doctor_id, fiscal_year);

create index if not exists invoices_patient_idx
  on public.invoices (patient_id);

create index if not exists invoices_visit_idx
  on public.invoices (visit_id);

alter table public.invoices enable row level security;

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own"
  on public.invoices for select
  using (auth.uid() = doctor_id);

drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own"
  on public.invoices for insert
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own"
  on public.invoices for update
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

-- No DELETE policy — invoices are accounting records; cancel via status/notes, don't delete.

-- Per-doctor per-FY sequence tracker. SECURITY DEFINER RPC serializes on this row.
create table if not exists public.invoice_sequences (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  fiscal_year text not null,
  last_number integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (doctor_id, fiscal_year)
);

alter table public.invoice_sequences enable row level security;

drop policy if exists "invoice_sequences_select_own" on public.invoice_sequences;
create policy "invoice_sequences_select_own"
  on public.invoice_sequences for select
  using (auth.uid() = doctor_id);

-- No direct INSERT/UPDATE/DELETE policies — mutations happen only via the SECURITY DEFINER RPC.

-- Atomic next-number RPC. Returns `TC/{FY}/{NNNN}` with NNNN zero-padded to 4 digits.
-- Uses INSERT ... ON CONFLICT DO UPDATE ... RETURNING for a single atomic sequence bump.
create or replace function public.next_invoice_number(p_doctor_id uuid, p_fy text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if p_doctor_id is null or p_fy is null or p_fy = '' then
    raise exception 'doctor_id and fy are required';
  end if;
  if auth.uid() is not null and auth.uid() <> p_doctor_id then
    raise exception 'not authorized to allocate invoice number for this doctor';
  end if;

  insert into public.invoice_sequences (doctor_id, fiscal_year, last_number, updated_at)
  values (p_doctor_id, p_fy, 1, now())
  on conflict (doctor_id, fiscal_year) do update
    set last_number = public.invoice_sequences.last_number + 1,
        updated_at = now()
  returning last_number into v_next;

  return 'TC/' || p_fy || '/' || lpad(v_next::text, 4, '0');
end;
$$;

grant execute on function public.next_invoice_number(uuid, text) to authenticated;

create or replace function public.touch_invoices_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists invoices_touch_updated_at on public.invoices;
create trigger invoices_touch_updated_at
  before update on public.invoices
  for each row execute function public.touch_invoices_updated_at();
