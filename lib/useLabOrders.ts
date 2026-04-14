"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { scheduleFollowUpAppointment } from "./useFollowUpSuggestion";
import type {
  Appointment,
  FollowUpProtocol,
  LabOrder,
  LabOrderStatus,
  LabTestCategory,
} from "./types";

// ============================================================
// Create a lab order.
// ============================================================
export interface CreateLabOrderParams {
  doctorId: string;
  patientId: string;
  visitId?: string | null;
  prescriptionId?: string | null;
  testName: string;
  testCategory: LabTestCategory;
  priority?: "routine" | "urgent" | "stat";
  clinicalNotes?: string | null;
  reason?: string | null;
  fastingRequired?: boolean;
  patientInstructions?: string | null;
  externalLabName?: string | null;
  externalLabPhone?: string | null;
  tests?: { name: string; code?: string; notes?: string }[];
}

export async function createLabOrder(
  params: CreateLabOrderParams
): Promise<{ data: LabOrder | null; error: Error | null }> {
  if (!params.doctorId || !params.patientId || !params.testName) {
    return {
      data: null,
      error: new Error("doctorId, patientId, testName required"),
    };
  }

  const payload = {
    doctor_id: params.doctorId,
    clinic_id: params.doctorId,
    patient_id: params.patientId,
    visit_id: params.visitId ?? null,
    prescription_id: params.prescriptionId ?? null,
    test_name: params.testName,
    test_category: params.testCategory,
    priority: params.priority ?? "routine",
    clinical_notes: params.clinicalNotes ?? null,
    reason: params.reason ?? null,
    fasting_required: params.fastingRequired ?? false,
    patient_instructions: params.patientInstructions ?? null,
    external_lab_name: params.externalLabName ?? null,
    external_lab_phone: params.externalLabPhone ?? null,
    tests: params.tests ?? [],
    status: "ordered" as const,
  };

  const { data, error } = await supabase
    .from("lab_orders")
    .insert(payload)
    .select("*")
    .single();

  return {
    data: (data as LabOrder) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

// ============================================================
// Status transitions. Schema's BEFORE UPDATE trigger auto-stamps
// sample_collected_at / results_available_at / reviewed_at /
// cancelled_at, so we only set status + any companion fields.
// ============================================================
async function updateStatus(
  orderId: string,
  patch: Partial<LabOrder>
): Promise<{ data: LabOrder | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("lab_orders")
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single();

  return {
    data: (data as LabOrder) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export function markSampleCollected(orderId: string) {
  return updateStatus(orderId, { status: "sample_collected" });
}

export function markInProgress(orderId: string) {
  return updateStatus(orderId, { status: "in_progress" });
}

export function markResultsAvailable(
  orderId: string,
  extras?: {
    isAbnormal?: boolean;
    resultSummary?: string | null;
    resultPdfUrl?: string | null;
    resultValues?: Record<string, unknown> | null;
  }
) {
  const patch: Partial<LabOrder> = { status: "results_available" };
  if (extras?.isAbnormal !== undefined) patch.is_abnormal = extras.isAbnormal;
  if (extras?.resultSummary !== undefined)
    patch.result_summary = extras.resultSummary;
  if (extras?.resultPdfUrl !== undefined)
    patch.result_pdf_url = extras.resultPdfUrl;
  if (extras?.resultValues !== undefined)
    patch.result_values = extras.resultValues;
  return updateStatus(orderId, patch);
}

export function markReviewed(
  orderId: string,
  reviewNotes?: string | null
): Promise<{ data: LabOrder | null; error: Error | null }> {
  const patch: Partial<LabOrder> = { status: "reviewed" };
  if (reviewNotes !== undefined) patch.doctor_review_notes = reviewNotes;
  return updateStatus(orderId, patch);
}

export function cancelLabOrder(
  orderId: string,
  reason?: string | null
): Promise<{ data: LabOrder | null; error: Error | null }> {
  const patch: Partial<LabOrder> = { status: "cancelled" };
  if (reason !== undefined) patch.cancellation_reason = reason;
  return updateStatus(orderId, patch);
}

// ============================================================
// Upload a lab result file (PDF or image) to Supabase Storage
// bucket `lab-results/{patient_id}/…` and mark results_available.
// ============================================================
export async function uploadLabResult(params: {
  orderId: string;
  patientId: string;
  file: File;
  isAbnormal?: boolean;
  resultSummary?: string | null;
  resultValues?: Record<string, unknown> | null;
}): Promise<{ data: LabOrder | null; error: Error | null }> {
  if (!params.file || !params.orderId || !params.patientId) {
    return {
      data: null,
      error: new Error("orderId, patientId, and file required"),
    };
  }

  const ext =
    params.file.name.split(".").pop()?.toLowerCase() ||
    (params.file.type.includes("pdf") ? "pdf" : "bin");
  const path = `${params.patientId}/${params.orderId}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("lab-results")
    .upload(path, params.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: params.file.type || undefined,
    });
  if (upErr) return { data: null, error: new Error(upErr.message) };

  const { data: pub } = supabase.storage.from("lab-results").getPublicUrl(path);
  const resultPdfUrl = pub?.publicUrl ?? path;

  return markResultsAvailable(params.orderId, {
    resultPdfUrl,
    isAbnormal: params.isAbnormal,
    resultSummary: params.resultSummary,
    resultValues: params.resultValues,
  });
}

// ============================================================
// Isotretinoin auto-LFT integration.
// Called alongside useFollowUpSuggestion when scheduling a follow-up.
// Detects the Isotretinoin protocol by condition_name match and
// inserts a routine LFT lab_order linked to the new appointment.
// ============================================================
export function isIsotretinoinProtocol(
  protocol: FollowUpProtocol | null | undefined
): boolean {
  if (!protocol?.condition_name) return false;
  return protocol.condition_name.trim().toLowerCase() === "isotretinoin";
}

export async function autoOrderIsotretinoinLFT(params: {
  doctorId: string;
  patientId: string;
  appointmentId: string;
}): Promise<{ data: LabOrder | null; error: Error | null; created: boolean }> {
  // Idempotency guard — don't double-insert if one already exists for
  // this appointment + LFT test name.
  const { data: existing } = await supabase
    .from("lab_orders")
    .select("id")
    .eq("doctor_id", params.doctorId)
    .eq("patient_id", params.patientId)
    .eq("visit_id", params.appointmentId)
    .eq("test_name", "LFT")
    .maybeSingle();

  if (existing?.id) {
    return { data: null, error: null, created: false };
  }

  const res = await createLabOrder({
    doctorId: params.doctorId,
    patientId: params.patientId,
    visitId: params.appointmentId,
    testName: "LFT",
    testCategory: "biochemistry",
    priority: "routine",
    clinicalNotes: "Monthly isotretinoin monitoring",
    reason: "Isotretinoin safety monitoring",
    fastingRequired: false,
  });

  return { ...res, created: !res.error };
}

// ============================================================
// One-shot helper: schedule follow-up + (if Isotretinoin) auto-LFT.
// Compose this over `scheduleFollowUpAppointment` so callers get
// both side-effects with a single call.
// ============================================================
export interface ScheduleFollowUpWithLabsParams {
  doctorId: string;
  patientId: string;
  protocol: FollowUpProtocol;
  fromVisitId: string | null;
  date: string;
  time: string;
  durationMinutes?: number;
  reason?: string | null;
  notes?: string | null;
  visitFee?: number | null;
}

export interface ScheduleFollowUpWithLabsResult {
  appointment: Appointment | null;
  labOrder: LabOrder | null;
  appointmentError: Error | null;
  labOrderError: Error | null;
}

export async function scheduleFollowUpWithLabs(
  params: ScheduleFollowUpWithLabsParams
): Promise<ScheduleFollowUpWithLabsResult> {
  const apptRes = await scheduleFollowUpAppointment({
    doctorId: params.doctorId,
    patientId: params.patientId,
    fromVisitId: params.fromVisitId,
    date: params.date,
    time: params.time,
    durationMinutes: params.durationMinutes,
    reason: params.reason ?? params.protocol.condition_name,
    notes: params.notes ?? params.protocol.notes,
    visitFee: params.visitFee,
  });

  const out: ScheduleFollowUpWithLabsResult = {
    appointment: apptRes.data,
    labOrder: null,
    appointmentError: apptRes.error,
    labOrderError: null,
  };

  if (!apptRes.data || !isIsotretinoinProtocol(params.protocol)) {
    return out;
  }

  const lab = await autoOrderIsotretinoinLFT({
    doctorId: params.doctorId,
    patientId: params.patientId,
    appointmentId: apptRes.data.id,
  });
  out.labOrder = lab.data;
  out.labOrderError = lab.error;
  return out;
}

// ============================================================
// Queries / hooks.
// ============================================================
export async function fetchLabOrdersForDoctor(
  doctorId: string,
  opts?: { status?: LabOrderStatus | LabOrderStatus[]; limit?: number }
): Promise<LabOrder[]> {
  if (!doctorId) return [];
  let q = supabase
    .from("lab_orders")
    .select("*, patients(id, name, phone)")
    .eq("doctor_id", doctorId)
    .order("ordered_at", { ascending: false });
  if (opts?.status) {
    if (Array.isArray(opts.status)) q = q.in("status", opts.status);
    else q = q.eq("status", opts.status);
  }
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as LabOrder[];
}

export async function fetchLabOrdersForPatient(
  doctorId: string,
  patientId: string
): Promise<LabOrder[]> {
  if (!doctorId || !patientId) return [];
  const { data, error } = await supabase
    .from("lab_orders")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("patient_id", patientId)
    .order("ordered_at", { ascending: false });
  if (error || !data) return [];
  return data as LabOrder[];
}

// Pending-review badge counter for dashboard — orders the doctor
// still needs to review (results_available but not yet reviewed).
export async function fetchPendingLabReviewCount(
  doctorId: string
): Promise<number> {
  if (!doctorId) return 0;
  const { count } = await supabase
    .from("lab_orders")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId)
    .eq("status", "results_available");
  return count ?? 0;
}

export function useLabOrders(
  doctorId: string | null | undefined,
  opts?: { status?: LabOrderStatus | LabOrderStatus[]; limit?: number }
) {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchLabOrdersForDoctor(doctorId, opts));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [doctorId, opts]);

  useEffect(() => {
    if (!doctorId) {
      setOrders([]);
      return;
    }
    refresh();
  }, [doctorId, refresh]);

  return { orders, loading, error, refresh };
}

export function usePendingLabReviewBadge(
  doctorId: string | null | undefined
) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      setCount(await fetchPendingLabReviewCount(doctorId));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) {
      setCount(0);
      return;
    }
    refresh();
  }, [doctorId, refresh]);

  return { count, loading, refresh };
}
