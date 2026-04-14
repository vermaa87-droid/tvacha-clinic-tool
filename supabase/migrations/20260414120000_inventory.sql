-- Phase 3 Task #1: Inventory / pharmacy stock management.
-- Doctor IS the clinic — clinic_id is enforced to equal doctor_id.
--
-- Tables:
--   inventory_items        : SKU master per doctor (medicine / consumable / equipment).
--   inventory_suppliers    : purchase sources per doctor.
--   inventory_batches      : per-batch lot with expiry + qty on hand (FEFO key).
--   stock_transactions     : append-only ledger of every stock movement.
--   purchase_orders        : PO header per doctor.
--   purchase_order_items   : PO line items.
--   drug_reference         : global reference (doctor_id null) + per-doctor additions.
--
-- View:
--   current_stock          : per item totals with FEFO nearest-expiry batch.
--
-- Functions:
--   deduct_stock(...)      : FEFO auto-deduction writing stock_transactions atomically (SECURITY DEFINER).
--   next_po_number(...)    : per-doctor per-fiscal-year PO numbering (TC-PO/{FY}/NNNN).
--   seed_drug_reference_global() : one-time global seed of common Indian derm drugs.

-- ============================================================
-- inventory_suppliers
-- ============================================================
create table if not exists public.inventory_suppliers (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  gstin text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_suppliers_clinic_matches_doctor check (clinic_id = doctor_id),
  constraint inventory_suppliers_gstin_format_chk
    check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
);

create index if not exists inventory_suppliers_doctor_idx on public.inventory_suppliers (doctor_id);
create index if not exists inventory_suppliers_doctor_active_idx on public.inventory_suppliers (doctor_id, is_active);
create unique index if not exists inventory_suppliers_doctor_name_unique on public.inventory_suppliers (doctor_id, lower(name));

alter table public.inventory_suppliers enable row level security;

drop policy if exists "inventory_suppliers_select_own" on public.inventory_suppliers;
create policy "inventory_suppliers_select_own" on public.inventory_suppliers for select using (auth.uid() = doctor_id);

drop policy if exists "inventory_suppliers_insert_own" on public.inventory_suppliers;
create policy "inventory_suppliers_insert_own" on public.inventory_suppliers for insert with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "inventory_suppliers_update_own" on public.inventory_suppliers;
create policy "inventory_suppliers_update_own" on public.inventory_suppliers for update using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "inventory_suppliers_delete_own" on public.inventory_suppliers;
create policy "inventory_suppliers_delete_own" on public.inventory_suppliers for delete using (auth.uid() = doctor_id);

-- ============================================================
-- inventory_items (SKU master)
-- ============================================================
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  name text not null,
  generic_name text,
  category text not null default 'medicine'
    check (category in ('medicine', 'consumable', 'equipment', 'cosmetic', 'injectable', 'other')),
  form text,
  strength text,
  unit text not null default 'unit',
  hsn_sac text,
  gst_rate numeric(5,2) check (gst_rate is null or (gst_rate >= 0 and gst_rate <= 100)),
  mrp numeric(10,2) check (mrp is null or mrp >= 0),
  selling_price numeric(10,2) check (selling_price is null or selling_price >= 0),
  reorder_level integer not null default 10 check (reorder_level >= 0),
  reorder_quantity integer not null default 50 check (reorder_quantity >= 0),
  is_schedule_h boolean not null default false,
  is_active boolean not null default true,
  barcode text,
  notes text,
  drug_reference_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_clinic_matches_doctor check (clinic_id = doctor_id)
);

create index if not exists inventory_items_doctor_idx on public.inventory_items (doctor_id);
create index if not exists inventory_items_doctor_active_idx on public.inventory_items (doctor_id, is_active);
create index if not exists inventory_items_doctor_category_idx on public.inventory_items (doctor_id, category);
create index if not exists inventory_items_doctor_barcode_idx on public.inventory_items (doctor_id, barcode) where barcode is not null;
create unique index if not exists inventory_items_doctor_name_form_strength_unique
  on public.inventory_items (doctor_id, lower(name), coalesce(lower(form), ''), coalesce(lower(strength), ''));

alter table public.inventory_items enable row level security;

drop policy if exists "inventory_items_select_own" on public.inventory_items;
create policy "inventory_items_select_own" on public.inventory_items for select using (auth.uid() = doctor_id);

drop policy if exists "inventory_items_insert_own" on public.inventory_items;
create policy "inventory_items_insert_own" on public.inventory_items for insert with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "inventory_items_update_own" on public.inventory_items;
create policy "inventory_items_update_own" on public.inventory_items for update using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "inventory_items_delete_own" on public.inventory_items;
create policy "inventory_items_delete_own" on public.inventory_items for delete using (auth.uid() = doctor_id);

-- ============================================================
-- inventory_batches (FEFO-capable lot tracking)
-- ============================================================
create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  supplier_id uuid references public.inventory_suppliers(id) on delete set null,
  batch_number text not null,
  expiry_date date,
  manufacture_date date,
  quantity_received integer not null check (quantity_received > 0),
  quantity_on_hand integer not null check (quantity_on_hand >= 0),
  cost_per_unit numeric(10,2) check (cost_per_unit is null or cost_per_unit >= 0),
  mrp_per_unit numeric(10,2) check (mrp_per_unit is null or mrp_per_unit >= 0),
  received_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  invoice_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_batches_clinic_matches_doctor check (clinic_id = doctor_id),
  constraint inventory_batches_on_hand_le_received check (quantity_on_hand <= quantity_received),
  constraint inventory_batches_dates_sane check (manufacture_date is null or expiry_date is null or expiry_date >= manufacture_date)
);

create index if not exists inventory_batches_item_idx on public.inventory_batches (item_id);
create index if not exists inventory_batches_doctor_idx on public.inventory_batches (doctor_id);
create index if not exists inventory_batches_item_expiry_idx on public.inventory_batches (item_id, expiry_date nulls last) where quantity_on_hand > 0;
create index if not exists inventory_batches_doctor_expiry_idx on public.inventory_batches (doctor_id, expiry_date) where quantity_on_hand > 0 and expiry_date is not null;
create unique index if not exists inventory_batches_item_batch_unique on public.inventory_batches (item_id, batch_number);

alter table public.inventory_batches enable row level security;

drop policy if exists "inventory_batches_select_own" on public.inventory_batches;
create policy "inventory_batches_select_own" on public.inventory_batches for select using (auth.uid() = doctor_id);

drop policy if exists "inventory_batches_insert_own" on public.inventory_batches;
create policy "inventory_batches_insert_own" on public.inventory_batches for insert with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "inventory_batches_update_own" on public.inventory_batches;
create policy "inventory_batches_update_own" on public.inventory_batches for update using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "inventory_batches_delete_own" on public.inventory_batches;
create policy "inventory_batches_delete_own" on public.inventory_batches for delete using (auth.uid() = doctor_id);

-- ============================================================
-- stock_transactions (append-only ledger)
-- ============================================================
create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  batch_id uuid references public.inventory_batches(id) on delete set null,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  transaction_type text not null
    check (transaction_type in ('receipt', 'dispense', 'adjustment', 'write_off', 'return', 'transfer')),
  quantity_change integer not null,
  quantity_after integer,
  reference_type text,
  reference_id uuid,
  patient_id uuid references public.patients(id) on delete set null,
  prescription_id uuid references public.prescriptions(id) on delete set null,
  visit_id uuid references public.appointments(id) on delete set null,
  reason text,
  notes text,
  performed_by uuid references public.doctors(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_transactions_clinic_matches_doctor check (clinic_id = doctor_id),
  constraint stock_transactions_qty_sign check (
    (transaction_type in ('receipt', 'return') and quantity_change > 0)
    or (transaction_type in ('dispense', 'write_off') and quantity_change < 0)
    or (transaction_type in ('adjustment', 'transfer'))
  )
);

create index if not exists stock_transactions_item_idx on public.stock_transactions (item_id, created_at desc);
create index if not exists stock_transactions_batch_idx on public.stock_transactions (batch_id);
create index if not exists stock_transactions_doctor_created_idx on public.stock_transactions (doctor_id, created_at desc);
create index if not exists stock_transactions_doctor_type_idx on public.stock_transactions (doctor_id, transaction_type);
create index if not exists stock_transactions_patient_idx on public.stock_transactions (patient_id) where patient_id is not null;
create index if not exists stock_transactions_prescription_idx on public.stock_transactions (prescription_id) where prescription_id is not null;

alter table public.stock_transactions enable row level security;

drop policy if exists "stock_transactions_select_own" on public.stock_transactions;
create policy "stock_transactions_select_own" on public.stock_transactions for select using (auth.uid() = doctor_id);

-- No direct INSERT/UPDATE/DELETE policies — mutations go through SECURITY DEFINER functions.

-- ============================================================
-- purchase_orders
-- ============================================================
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid not null references public.doctors(id) on delete cascade,
  supplier_id uuid references public.inventory_suppliers(id) on delete set null,
  po_number text not null,
  fiscal_year text not null,
  po_date date not null default (now() at time zone 'Asia/Kolkata')::date,
  expected_date date,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  pdf_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_orders_clinic_matches_doctor check (clinic_id = doctor_id)
);

create unique index if not exists purchase_orders_doctor_number_unique on public.purchase_orders (doctor_id, po_number);
create index if not exists purchase_orders_doctor_date_idx on public.purchase_orders (doctor_id, po_date desc);
create index if not exists purchase_orders_doctor_status_idx on public.purchase_orders (doctor_id, status);
create index if not exists purchase_orders_supplier_idx on public.purchase_orders (supplier_id);

alter table public.purchase_orders enable row level security;

drop policy if exists "purchase_orders_select_own" on public.purchase_orders;
create policy "purchase_orders_select_own" on public.purchase_orders for select using (auth.uid() = doctor_id);

drop policy if exists "purchase_orders_insert_own" on public.purchase_orders;
create policy "purchase_orders_insert_own" on public.purchase_orders for insert with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "purchase_orders_update_own" on public.purchase_orders;
create policy "purchase_orders_update_own" on public.purchase_orders for update using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id and clinic_id = doctor_id);

drop policy if exists "purchase_orders_delete_own" on public.purchase_orders;
create policy "purchase_orders_delete_own" on public.purchase_orders for delete using (auth.uid() = doctor_id and status = 'draft');

-- PO number sequence tracker (same pattern as invoices).
create table if not exists public.po_sequences (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  fiscal_year text not null,
  last_number integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (doctor_id, fiscal_year)
);

alter table public.po_sequences enable row level security;

drop policy if exists "po_sequences_select_own" on public.po_sequences;
create policy "po_sequences_select_own" on public.po_sequences for select using (auth.uid() = doctor_id);

create or replace function public.next_po_number(p_doctor_id uuid, p_fy text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_next integer;
begin
  if p_doctor_id is null or p_fy is null or p_fy = '' then
    raise exception 'doctor_id and fy are required';
  end if;
  if auth.uid() is not null and auth.uid() <> p_doctor_id then
    raise exception 'not authorized to allocate PO number for this doctor';
  end if;

  insert into public.po_sequences (doctor_id, fiscal_year, last_number, updated_at)
  values (p_doctor_id, p_fy, 1, now())
  on conflict (doctor_id, fiscal_year) do update
    set last_number = public.po_sequences.last_number + 1,
        updated_at = now()
  returning last_number into v_next;

  return 'TC-PO/' || p_fy || '/' || lpad(v_next::text, 4, '0');
end;
$$;

grant execute on function public.next_po_number(uuid, text) to authenticated;

-- ============================================================
-- purchase_order_items
-- ============================================================
create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid references public.inventory_items(id) on delete set null,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  gst_rate numeric(5,2) check (gst_rate is null or (gst_rate >= 0 and gst_rate <= 100)),
  line_total numeric(12,2) not null check (line_total >= 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint purchase_order_items_received_bounded check (quantity_received <= quantity)
);

create index if not exists purchase_order_items_po_idx on public.purchase_order_items (po_id);
create index if not exists purchase_order_items_item_idx on public.purchase_order_items (item_id);
create index if not exists purchase_order_items_doctor_idx on public.purchase_order_items (doctor_id);

alter table public.purchase_order_items enable row level security;

drop policy if exists "purchase_order_items_select_own" on public.purchase_order_items;
create policy "purchase_order_items_select_own" on public.purchase_order_items for select using (auth.uid() = doctor_id);

drop policy if exists "purchase_order_items_insert_own" on public.purchase_order_items;
create policy "purchase_order_items_insert_own" on public.purchase_order_items for insert with check (auth.uid() = doctor_id);

drop policy if exists "purchase_order_items_update_own" on public.purchase_order_items;
create policy "purchase_order_items_update_own" on public.purchase_order_items for update using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id);

drop policy if exists "purchase_order_items_delete_own" on public.purchase_order_items;
create policy "purchase_order_items_delete_own" on public.purchase_order_items for delete using (auth.uid() = doctor_id);

-- ============================================================
-- drug_reference (global + per-doctor additions)
-- doctor_id null == global / system seed. Per-doctor rows allowed for custom drugs.
-- ============================================================
create table if not exists public.drug_reference (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references public.doctors(id) on delete cascade,
  name text not null,
  generic_name text,
  brand_names text[],
  category text,
  form text,
  common_strengths text[],
  indication text,
  is_schedule_h boolean not null default false,
  is_system boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists drug_reference_name_trgm_idx on public.drug_reference (lower(name));
create index if not exists drug_reference_generic_idx on public.drug_reference (lower(generic_name));
create index if not exists drug_reference_doctor_idx on public.drug_reference (doctor_id);
create unique index if not exists drug_reference_system_name_unique
  on public.drug_reference (lower(name), coalesce(lower(form), ''), coalesce(lower(generic_name), ''))
  where doctor_id is null;

alter table public.drug_reference enable row level security;

-- Anyone authenticated can read the global catalogue + their own custom additions.
drop policy if exists "drug_reference_select_visible" on public.drug_reference;
create policy "drug_reference_select_visible"
  on public.drug_reference for select
  using (doctor_id is null or auth.uid() = doctor_id);

drop policy if exists "drug_reference_insert_own" on public.drug_reference;
create policy "drug_reference_insert_own"
  on public.drug_reference for insert
  with check (auth.uid() = doctor_id and is_system = false);

drop policy if exists "drug_reference_update_own" on public.drug_reference;
create policy "drug_reference_update_own"
  on public.drug_reference for update
  using (auth.uid() = doctor_id and is_system = false)
  with check (auth.uid() = doctor_id and is_system = false);

drop policy if exists "drug_reference_delete_own" on public.drug_reference;
create policy "drug_reference_delete_own"
  on public.drug_reference for delete
  using (auth.uid() = doctor_id and is_system = false);

-- Add FK from inventory_items.drug_reference_id → drug_reference.id.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'inventory_items_drug_reference_fk'
  ) then
    alter table public.inventory_items
      add constraint inventory_items_drug_reference_fk
      foreign key (drug_reference_id) references public.drug_reference(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- current_stock view — per item totals + FEFO nearest-expiry batch.
-- SECURITY INVOKER so RLS on underlying tables applies per caller.
-- ============================================================
drop view if exists public.current_stock;
create view public.current_stock
with (security_invoker = true)
as
select
  i.id as item_id,
  i.doctor_id,
  i.clinic_id,
  i.name,
  i.generic_name,
  i.category,
  i.form,
  i.strength,
  i.unit,
  i.reorder_level,
  i.reorder_quantity,
  i.is_schedule_h,
  i.is_active,
  coalesce(sum(b.quantity_on_hand), 0)::integer as total_on_hand,
  count(b.id) filter (where b.quantity_on_hand > 0)::integer as active_batches,
  min(b.expiry_date) filter (where b.quantity_on_hand > 0) as nearest_expiry,
  (
    select b2.id from public.inventory_batches b2
    where b2.item_id = i.id and b2.quantity_on_hand > 0
    order by b2.expiry_date nulls last, b2.received_date asc
    limit 1
  ) as fefo_batch_id,
  (coalesce(sum(b.quantity_on_hand), 0) <= i.reorder_level) as is_low_stock,
  (min(b.expiry_date) filter (where b.quantity_on_hand > 0)
    <= ((now() at time zone 'Asia/Kolkata')::date + interval '30 days')::date) as has_near_expiry
from public.inventory_items i
left join public.inventory_batches b on b.item_id = i.id
group by i.id;

grant select on public.current_stock to authenticated;

-- ============================================================
-- deduct_stock RPC — FEFO auto-deduction + atomic ledger write.
-- Consumes from earliest-expiry batches first, zero-quantity batches last.
-- Raises if insufficient stock (does NOT allow negatives).
-- Writes one stock_transactions row per batch touched.
-- ============================================================
create or replace function public.deduct_stock(
  p_item_id uuid,
  p_quantity integer,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_patient_id uuid default null,
  p_prescription_id uuid default null,
  p_visit_id uuid default null,
  p_reason text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_available integer;
  v_remaining integer := p_quantity;
  v_taken integer;
  v_batch record;
  v_touched jsonb := '[]'::jsonb;
  v_new_on_hand integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;

  select doctor_id into v_doctor_id from public.inventory_items where id = p_item_id;
  if v_doctor_id is null then
    raise exception 'inventory item % not found', p_item_id;
  end if;
  if auth.uid() is not null and auth.uid() <> v_doctor_id then
    raise exception 'not authorized to deduct stock for this item';
  end if;

  -- Lock and sum available.
  select coalesce(sum(quantity_on_hand), 0) into v_available
  from public.inventory_batches
  where item_id = p_item_id
  for update;

  if v_available < p_quantity then
    raise exception 'insufficient stock: need %, available %', p_quantity, v_available;
  end if;

  -- FEFO loop: earliest expiry first, NULL expiry last, then oldest received.
  for v_batch in
    select * from public.inventory_batches
    where item_id = p_item_id and quantity_on_hand > 0
    order by expiry_date nulls last, received_date asc, created_at asc
    for update
  loop
    exit when v_remaining <= 0;

    v_taken := least(v_remaining, v_batch.quantity_on_hand);
    v_new_on_hand := v_batch.quantity_on_hand - v_taken;

    update public.inventory_batches
      set quantity_on_hand = v_new_on_hand,
          updated_at = now()
      where id = v_batch.id;

    insert into public.stock_transactions
      (item_id, batch_id, doctor_id, clinic_id, transaction_type, quantity_change, quantity_after,
       reference_type, reference_id, patient_id, prescription_id, visit_id, reason, notes, performed_by)
    values
      (p_item_id, v_batch.id, v_doctor_id, v_doctor_id, 'dispense', -v_taken, v_new_on_hand,
       p_reference_type, p_reference_id, p_patient_id, p_prescription_id, p_visit_id, p_reason, p_notes, v_doctor_id);

    v_touched := v_touched || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_number', v_batch.batch_number,
      'expiry_date', v_batch.expiry_date,
      'quantity_taken', v_taken,
      'quantity_after', v_new_on_hand
    );

    v_remaining := v_remaining - v_taken;
  end loop;

  if v_remaining > 0 then
    -- Should not happen given the earlier availability check, but guard anyway.
    raise exception 'deduct_stock FEFO loop exhausted with % remaining', v_remaining;
  end if;

  return jsonb_build_object(
    'item_id', p_item_id,
    'quantity_deducted', p_quantity,
    'batches_touched', v_touched
  );
end;
$$;

grant execute on function public.deduct_stock(uuid, integer, text, uuid, uuid, uuid, uuid, text, text) to authenticated;

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.touch_inventory_suppliers_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists inventory_suppliers_touch_updated_at on public.inventory_suppliers;
create trigger inventory_suppliers_touch_updated_at before update on public.inventory_suppliers
  for each row execute function public.touch_inventory_suppliers_updated_at();

create or replace function public.touch_inventory_items_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists inventory_items_touch_updated_at on public.inventory_items;
create trigger inventory_items_touch_updated_at before update on public.inventory_items
  for each row execute function public.touch_inventory_items_updated_at();

create or replace function public.touch_inventory_batches_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists inventory_batches_touch_updated_at on public.inventory_batches;
create trigger inventory_batches_touch_updated_at before update on public.inventory_batches
  for each row execute function public.touch_inventory_batches_updated_at();

create or replace function public.touch_purchase_orders_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists purchase_orders_touch_updated_at on public.purchase_orders;
create trigger purchase_orders_touch_updated_at before update on public.purchase_orders
  for each row execute function public.touch_purchase_orders_updated_at();

-- ============================================================
-- drug_reference global seed — common Indian dermatology prescribing set.
-- Idempotent via unique index on (lower(name), form, generic) where doctor_id is null.
-- ============================================================
create or replace function public.seed_drug_reference_global()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.drug_reference
    (doctor_id, name, generic_name, brand_names, category, form, common_strengths, indication, is_schedule_h, is_system)
  values
    -- Topicals
    (null, 'Clobetasol Propionate', 'Clobetasol', array['Tenovate','Clobetamil','Dermotyl'], 'topical_steroid', 'cream', array['0.05%'], 'Potent topical steroid - psoriasis, lichen planus. Avoid face/folds.', false, true),
    (null, 'Mometasone Furoate', 'Mometasone', array['Elocon','Metaderm'], 'topical_steroid', 'cream', array['0.1%'], 'Mid-potency topical steroid - eczema, dermatitis.', false, true),
    (null, 'Hydrocortisone', 'Hydrocortisone', array['Cortaid','Efcorlin'], 'topical_steroid', 'cream', array['1%','2.5%'], 'Mild topical steroid - safe for face and children.', false, true),
    (null, 'Tacrolimus', 'Tacrolimus', array['Protopic','Tacroz'], 'topical_immunomodulator', 'ointment', array['0.03%','0.1%'], 'Calcineurin inhibitor - atopic dermatitis, vitiligo off-label.', false, true),
    (null, 'Pimecrolimus', 'Pimecrolimus', array['Elidel'], 'topical_immunomodulator', 'cream', array['1%'], 'Calcineurin inhibitor - mild/moderate atopic dermatitis.', false, true),
    (null, 'Adapalene', 'Adapalene', array['Deriva','Adaferin'], 'topical_retinoid', 'gel', array['0.1%','0.3%'], 'Acne vulgaris - comedonal and inflammatory.', false, true),
    (null, 'Tretinoin', 'Tretinoin', array['Retino-A','A-Ret'], 'topical_retinoid', 'cream', array['0.025%','0.05%','0.1%'], 'Acne, photoaging, melasma. Teratogenic - avoid in pregnancy.', false, true),
    (null, 'Benzoyl Peroxide', 'Benzoyl Peroxide', array['Persol','Benzac'], 'topical_antibacterial', 'gel', array['2.5%','5%','10%'], 'Acne - reduces P.acnes. Bleaches fabrics.', false, true),
    (null, 'Clindamycin (topical)', 'Clindamycin', array['Clindac-A','Cleocin-T'], 'topical_antibiotic', 'gel', array['1%'], 'Inflammatory acne - topical.', false, true),
    (null, 'Azelaic Acid', 'Azelaic Acid', array['Aziderm','Finacea'], 'topical_keratolytic', 'cream', array['10%','15%','20%'], 'Acne, rosacea, melasma.', false, true),
    (null, 'Hydroquinone', 'Hydroquinone', array['Melalite','Eukroma'], 'topical_depigmenting', 'cream', array['2%','4%'], 'Melasma, PIH. Limit 3 months continuous use.', false, true),
    (null, 'Kojic Acid', 'Kojic Acid', array['Kojiderm'], 'topical_depigmenting', 'cream', array['1%','2%'], 'Melasma adjunct, pigmentation.', false, true),
    (null, 'Ketoconazole (topical)', 'Ketoconazole', array['Nizral','KZ'], 'topical_antifungal', 'cream', array['2%'], 'Tinea, seborrheic dermatitis, pityriasis versicolor.', false, true),
    (null, 'Luliconazole', 'Luliconazole', array['Lulifin','Lulibet'], 'topical_antifungal', 'cream', array['1%'], 'Tinea corporis/cruris/pedis - once daily.', false, true),
    (null, 'Terbinafine (topical)', 'Terbinafine', array['Lamisil','Sebifin'], 'topical_antifungal', 'cream', array['1%'], 'Dermatophyte infections.', false, true),
    (null, 'Mupirocin', 'Mupirocin', array['T-Bact','Supirocin'], 'topical_antibiotic', 'ointment', array['2%'], 'Impetigo, staph skin infections, MRSA nasal decolonization.', false, true),
    (null, 'Fusidic Acid', 'Fusidic Acid', array['Fucidin','Fucibet'], 'topical_antibiotic', 'cream', array['2%'], 'Superficial staph/strep skin infections.', false, true),
    (null, 'Permethrin', 'Permethrin', array['Permite','Lyclear'], 'topical_antiparasitic', 'cream', array['5%'], 'Scabies - single application neck-down, repeat 7-14 days.', false, true),
    (null, 'Crotamiton', 'Crotamiton', array['Eurax'], 'topical_antiparasitic', 'cream', array['10%'], 'Scabies, pruritus. Less effective than permethrin.', false, true),
    (null, 'Calcipotriol', 'Calcipotriol', array['Daivonex','Sorvate'], 'topical_vitamin_d', 'ointment', array['0.005%'], 'Psoriasis - chronic plaque. Often combined with steroid.', false, true),
    (null, 'Salicylic Acid', 'Salicylic Acid', array['Saslic','Salytar'], 'topical_keratolytic', 'solution', array['2%','3%','6%'], 'Acne, keratolysis, warts (higher %).', false, true),
    (null, 'Minoxidil', 'Minoxidil', array['Mintop','Tugain','Rogaine'], 'topical_hair_growth', 'solution', array['2%','5%','10%'], 'Androgenetic alopecia. Evening application usually.', false, true),
    -- Orals - systemic dermatology
    (null, 'Isotretinoin', 'Isotretinoin', array['Sotret','Isotroin','Accutane'], 'oral_retinoid', 'capsule', array['10mg','20mg','30mg'], 'Severe/nodulocystic acne. Requires LFT + lipid monitoring. Category X in pregnancy.', true, true),
    (null, 'Doxycycline', 'Doxycycline', array['Doxy-1','Microdox'], 'oral_antibiotic', 'tablet', array['100mg'], 'Inflammatory acne, rosacea. Photosensitizing.', true, true),
    (null, 'Minocycline', 'Minocycline', array['Minoz','Divaine'], 'oral_antibiotic', 'tablet', array['50mg','100mg'], 'Inflammatory acne. Rare vestibular / hyperpigmentation SE.', true, true),
    (null, 'Azithromycin', 'Azithromycin', array['Azee','Azithral'], 'oral_antibiotic', 'tablet', array['250mg','500mg'], 'Acne pulse dosing, pyodermas.', true, true),
    (null, 'Cephalexin', 'Cephalexin', array['Sporidex','Phexin'], 'oral_antibiotic', 'capsule', array['250mg','500mg'], 'Pyoderma, cellulitis.', true, true),
    (null, 'Itraconazole', 'Itraconazole', array['Sporanox','Itaspor'], 'oral_antifungal', 'capsule', array['100mg','200mg'], 'Extensive/recurrent tinea, onychomycosis, candidiasis. LFT monitoring.', true, true),
    (null, 'Terbinafine (oral)', 'Terbinafine', array['Lamisil','Terbicip'], 'oral_antifungal', 'tablet', array['250mg'], 'Onychomycosis, extensive tinea. LFT monitoring.', true, true),
    (null, 'Fluconazole', 'Fluconazole', array['Forcan','Zocon'], 'oral_antifungal', 'tablet', array['50mg','150mg','200mg'], 'Candidiasis, pityriasis versicolor.', true, true),
    (null, 'Griseofulvin', 'Griseofulvin', array['Grisovin-FP'], 'oral_antifungal', 'tablet', array['125mg','250mg','500mg'], 'Tinea capitis - drug of choice in children.', true, true),
    (null, 'Methotrexate', 'Methotrexate', array['Folitrax','Methocel'], 'oral_immunosuppressant', 'tablet', array['2.5mg','7.5mg','10mg'], 'Severe psoriasis, eczema. Weekly dosing + folate. LFT/CBC monitoring.', true, true),
    (null, 'Cyclosporine', 'Cyclosporine', array['Sandimmun','Panimun'], 'oral_immunosuppressant', 'capsule', array['25mg','50mg','100mg'], 'Severe atopic dermatitis, psoriasis. BP + creatinine monitoring.', true, true),
    (null, 'Prednisolone', 'Prednisolone', array['Wysolone','Omnacortil'], 'oral_steroid', 'tablet', array['5mg','10mg','20mg','40mg'], 'Short-course for severe dermatoses. Taper over 2-4 weeks.', true, true),
    (null, 'Dapsone', 'Dapsone', array['Dapsone'], 'oral_sulfone', 'tablet', array['50mg','100mg'], 'DH, leprosy, bullous disorders. G6PD screen + monthly CBC.', true, true),
    (null, 'Hydroxychloroquine', 'Hydroxychloroquine', array['HCQS','Oxcq'], 'oral_antimalarial', 'tablet', array['200mg','400mg'], 'Cutaneous lupus, porphyria. Annual eye exam.', true, true),
    (null, 'Finasteride', 'Finasteride', array['Finpecia','Finast'], 'oral_5_alpha_reductase', 'tablet', array['1mg','5mg'], 'Androgenetic alopecia (1mg). Category X - avoid handling by pregnant women.', true, true),
    (null, 'Dutasteride', 'Dutasteride', array['Dutas','Veltam'], 'oral_5_alpha_reductase', 'capsule', array['0.5mg'], 'AGA off-label, BPH indicated.', true, true),
    (null, 'Spironolactone', 'Spironolactone', array['Aldactone','Spiromide'], 'oral_antiandrogen', 'tablet', array['25mg','50mg','100mg'], 'Female hormonal acne, hirsutism. K+ monitoring.', true, true),
    -- Antihistamines
    (null, 'Levocetirizine', 'Levocetirizine', array['Xyzal','Laveta'], 'oral_antihistamine', 'tablet', array['5mg'], 'Urticaria, allergic rhinitis. Non-sedating.', false, true),
    (null, 'Fexofenadine', 'Fexofenadine', array['Allegra','Fexo'], 'oral_antihistamine', 'tablet', array['120mg','180mg'], 'Urticaria, allergic rhinitis. Non-sedating.', false, true),
    (null, 'Cetirizine', 'Cetirizine', array['Cetzine','Alerid'], 'oral_antihistamine', 'tablet', array['10mg'], 'Urticaria, pruritus. Mildly sedating.', false, true),
    (null, 'Hydroxyzine', 'Hydroxyzine', array['Atarax'], 'oral_antihistamine', 'tablet', array['10mg','25mg'], 'Chronic urticaria, nocturnal pruritus. Sedating.', false, true),
    (null, 'Bilastine', 'Bilastine', array['Blizin'], 'oral_antihistamine', 'tablet', array['20mg'], 'Urticaria, allergic rhinitis. Non-sedating, minimal interaction.', false, true),
    -- Supplements commonly co-prescribed
    (null, 'Biotin', 'Biotin', array['Biotin'], 'supplement', 'tablet', array['5mg','10mg'], 'Hair thinning, brittle nails adjunct.', false, true),
    (null, 'Vitamin D3', 'Cholecalciferol', array['D-Rise','Calcirol'], 'supplement', 'capsule', array['60000IU'], 'Deficiency - weekly/monthly loading.', false, true),
    (null, 'Zinc Sulphate', 'Zinc', array['Zincovit','Zinconia'], 'supplement', 'tablet', array['50mg'], 'Acne adjunct, acrodermatitis.', false, true),
    (null, 'Folic Acid', 'Folic Acid', array['Folvite'], 'supplement', 'tablet', array['5mg'], 'Co-prescribed with methotrexate.', false, true)
  on conflict do nothing;
end;
$$;

-- Seed the global catalogue once.
select public.seed_drug_reference_global();
