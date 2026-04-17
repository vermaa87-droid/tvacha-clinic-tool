-- Fix: add INSERT RLS policy for stock_transactions so that authenticated
-- doctors can log receipt entries directly from the client.
--
-- Background: the original migration intentionally omitted a direct INSERT
-- policy because dispense / deduction mutations go through the
-- deduct_stock() SECURITY DEFINER RPC (which writes stock_transactions
-- atomically with the quantity_on_hand update). However, the Stock In flow
-- writes a receipt entry directly from the browser client, which was being
-- silently blocked by RLS with no INSERT policy present.
--
-- The RPC path is still the correct path for dispenses. This policy covers
-- the receipt / stock-in case only.

drop policy if exists "stock_transactions_insert_own" on public.stock_transactions;
create policy "stock_transactions_insert_own"
  on public.stock_transactions for insert
  with check (auth.uid() = doctor_id and clinic_id = doctor_id);
