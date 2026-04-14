import { createClient } from "@supabase/supabase-js";
import type { Appointment, DailyToken } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export type CheckInResult =
  | { ok: true; kind: "existing_appointment"; appointment: Appointment; token?: DailyToken }
  | { ok: true; kind: "walk_in"; token: DailyToken; deduplicated: boolean }
  | { ok: false; reason: "clinic_not_found" | "invalid_input" | "error"; message: string };

function istDate(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function verifyClinic(clinicId: string): Promise<{
  id: string;
  clinic_name: string;
  full_name: string;
} | null> {
  if (!clinicId) return null;
  const { data, error } = await publicClient
    .from("doctors")
    .select("id, clinic_name, full_name")
    .eq("id", clinicId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; clinic_name: string; full_name: string };
}

export interface QrCheckInParams {
  clinicId: string;
  phone: string;
  name?: string | null;
  chiefComplaint?: string | null;
}

export async function submitQrCheckIn(params: QrCheckInParams): Promise<CheckInResult> {
  const phone = normalizePhone(params.phone ?? "");
  if (!params.clinicId || phone.length < 10) {
    return { ok: false, reason: "invalid_input", message: "Valid clinic and 10-digit phone required." };
  }

  const clinic = await verifyClinic(params.clinicId);
  if (!clinic) {
    return { ok: false, reason: "clinic_not_found", message: "Clinic not found." };
  }

  const today = istDate();

  const { data: patient } = await publicClient
    .from("patients")
    .select("id, name, linked_doctor_id")
    .eq("linked_doctor_id", clinic.id)
    .ilike("phone", `%${phone}`)
    .limit(1)
    .maybeSingle();

  if (patient?.id) {
    const { data: appt } = await publicClient
      .from("appointments")
      .select("*")
      .eq("doctor_id", clinic.id)
      .eq("patient_id", patient.id)
      .eq("appointment_date", today)
      .in("status", ["scheduled", "confirmed"])
      .order("appointment_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (appt?.id) {
      const { data: updated, error: updErr } = await publicClient
        .from("appointments")
        .update({ status: "checked_in" })
        .eq("id", appt.id)
        .select("*")
        .single();
      if (updErr) {
        return { ok: false, reason: "error", message: updErr.message };
      }
      return { ok: true, kind: "existing_appointment", appointment: updated as Appointment };
    }

    const { data: dup } = await publicClient
      .from("daily_tokens")
      .select("*")
      .eq("clinic_id", clinic.id)
      .eq("token_date", today)
      .eq("patient_id", patient.id)
      .maybeSingle();
    if (dup?.id) {
      return { ok: true, kind: "walk_in", token: dup as DailyToken, deduplicated: true };
    }
  }

  const { data: dupWalkin } = await publicClient
    .from("daily_tokens")
    .select("*")
    .eq("clinic_id", clinic.id)
    .eq("token_date", today)
    .eq("walk_in_phone", phone)
    .maybeSingle();
  if (dupWalkin?.id) {
    return { ok: true, kind: "walk_in", token: dupWalkin as DailyToken, deduplicated: true };
  }

  const { data: nextNumData, error: nextErr } = await publicClient.rpc(
    "next_daily_token_number",
    { p_clinic_id: clinic.id, p_date: today }
  );
  if (nextErr) {
    return { ok: false, reason: "error", message: nextErr.message };
  }
  const tokenNumber = typeof nextNumData === "number" ? nextNumData : 1;

  const displayName = (params.name?.trim() || patient?.name || `Walk-in ${phone.slice(-4)}`).slice(0, 100);

  const { data: created, error: insErr } = await publicClient
    .from("daily_tokens")
    .insert({
      clinic_id: clinic.id,
      doctor_id: clinic.id,
      patient_id: null,
      token_number: tokenNumber,
      token_date: today,
      walk_in_name: displayName,
      walk_in_phone: phone,
      chief_complaint: params.chiefComplaint ?? null,
      status: "waiting",
    })
    .select("*")
    .single();

  if (insErr) {
    return { ok: false, reason: "error", message: insErr.message };
  }

  return { ok: true, kind: "walk_in", token: created as DailyToken, deduplicated: false };
}
