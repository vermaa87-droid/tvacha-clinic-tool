import { nanoid } from "nanoid";
import { supabase } from "./supabase";
import type { PatientFeedback } from "./types";

const DEFAULT_TOKEN_LEN = 21;

export function generateFeedbackToken(length: number = DEFAULT_TOKEN_LEN): string {
  return nanoid(length);
}

export function buildFeedbackUrl(token: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/feedback/${token}`;
}

export interface CreateFeedbackTokenParams {
  doctorId: string;
  patientId: string | null;
  visitId: string | null;
}

export async function createFeedbackToken(
  params: CreateFeedbackTokenParams
): Promise<{ token: string; url: string; row: PatientFeedback }> {
  const token = generateFeedbackToken();
  const { data, error } = await supabase
    .from("patient_feedback")
    .insert({
      doctor_id: params.doctorId,
      patient_id: params.patientId,
      visit_id: params.visitId,
      feedback_token: token,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return {
    token,
    url: buildFeedbackUrl(token),
    row: data as PatientFeedback,
  };
}

export interface PublicFeedbackContext {
  id: string;
  doctorId: string;
  patientId: string | null;
  visitId: string | null;
  rating: number | null;
  comment: string | null;
  improvementSuggestion: string | null;
  submittedAt: string | null;
  expiresAt: string;
  doctorName: string;
  clinicName: string;
}

export async function fetchFeedbackByToken(
  token: string
): Promise<PublicFeedbackContext | null> {
  const { data, error } = await supabase.rpc("get_feedback_by_token", {
    p_token: token,
  });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: row.id,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    visitId: row.visit_id,
    rating: row.rating,
    comment: row.comment,
    improvementSuggestion: row.improvement_suggestion,
    submittedAt: row.submitted_at,
    expiresAt: row.expires_at,
    doctorName: row.doctor_name,
    clinicName: row.clinic_name,
  };
}

export interface SubmitFeedbackParams {
  token: string;
  rating: number;
  comment?: string | null;
  improvement?: string | null;
  googleReviewClicked?: boolean;
}

export async function submitFeedback(
  params: SubmitFeedbackParams
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (params.rating < 1 || params.rating > 5) {
    return { ok: false, message: "Rating must be between 1 and 5." };
  }
  const { data, error } = await supabase.rpc("submit_feedback_by_token", {
    p_token: params.token,
    p_rating: params.rating,
    p_comment: params.comment ?? null,
    p_improvement: params.improvement ?? null,
    p_google_review_clicked: params.googleReviewClicked ?? false,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, id: data as string };
}
