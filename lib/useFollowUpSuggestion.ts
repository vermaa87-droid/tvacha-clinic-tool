"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Appointment, FollowUpProtocol } from "./types";

export interface FollowUpSuggestion {
  protocol: FollowUpProtocol;
  suggestedDate: string;
  suggestedTime: string;
  requiresLabs: boolean;
  labInstructions: string | null;
}

const CLINIC_DAY_START = "09:00";
const CLINIC_DAY_END = "18:00";
const DEFAULT_SLOT_MINUTES = 15;

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

export async function findFollowUpProtocol(
  doctorId: string,
  diagnosis: string
): Promise<FollowUpProtocol | null> {
  if (!doctorId || !diagnosis) return null;
  const needle = diagnosis.trim().toLowerCase();
  if (!needle) return null;

  const { data, error } = await supabase
    .from("follow_up_protocols")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("is_active", true);

  if (error || !data) return null;

  const exact = data.find(
    (p) => p.condition_name.trim().toLowerCase() === needle
  );
  if (exact) return exact as FollowUpProtocol;

  const partial = data.find((p) => {
    const cond = p.condition_name.trim().toLowerCase();
    return cond.includes(needle) || needle.includes(cond);
  });
  return (partial as FollowUpProtocol) ?? null;
}

export async function findFirstAvailableSlot(
  doctorId: string,
  date: string,
  durationMinutes: number = DEFAULT_SLOT_MINUTES
): Promise<string> {
  const { data } = await supabase
    .from("appointments")
    .select("appointment_time, duration_minutes, status")
    .eq("doctor_id", doctorId)
    .eq("appointment_date", date)
    .neq("status", "cancelled")
    .neq("status", "no_show");

  const taken = new Set<number>();
  (data ?? []).forEach((a: Partial<Appointment>) => {
    if (!a.appointment_time) return;
    const start = timeToMinutes(a.appointment_time.slice(0, 5));
    const dur = a.duration_minutes ?? DEFAULT_SLOT_MINUTES;
    for (let t = start; t < start + dur; t += DEFAULT_SLOT_MINUTES) {
      taken.add(t);
    }
  });

  const dayStart = timeToMinutes(CLINIC_DAY_START);
  const dayEnd = timeToMinutes(CLINIC_DAY_END);
  for (let t = dayStart; t + durationMinutes <= dayEnd; t += DEFAULT_SLOT_MINUTES) {
    let free = true;
    for (let s = t; s < t + durationMinutes; s += DEFAULT_SLOT_MINUTES) {
      if (taken.has(s)) {
        free = false;
        break;
      }
    }
    if (free) return minutesToTime(t);
  }
  return minutesToTime(dayStart);
}

export async function buildFollowUpSuggestion(params: {
  doctorId: string;
  diagnosis: string;
  visitDate: string;
}): Promise<FollowUpSuggestion | null> {
  const protocol = await findFollowUpProtocol(params.doctorId, params.diagnosis);
  if (!protocol) return null;

  const suggestedDate = addDays(params.visitDate, protocol.interval_days);
  const suggestedTime = await findFirstAvailableSlot(
    params.doctorId,
    suggestedDate
  );

  return {
    protocol,
    suggestedDate,
    suggestedTime,
    requiresLabs: protocol.requires_labs,
    labInstructions: protocol.lab_instructions,
  };
}

export interface ScheduleFollowUpParams {
  doctorId: string;
  patientId: string;
  fromVisitId: string | null;
  date: string;
  time: string;
  durationMinutes?: number;
  reason?: string | null;
  notes?: string | null;
  visitFee?: number | null;
}

export async function scheduleFollowUpAppointment(
  params: ScheduleFollowUpParams
): Promise<{ data: Appointment | null; error: Error | null }> {
  const payload = {
    doctor_id: params.doctorId,
    patient_id: params.patientId,
    appointment_date: params.date,
    appointment_time: params.time,
    duration_minutes: params.durationMinutes ?? DEFAULT_SLOT_MINUTES,
    type: "follow_up",
    status: "scheduled" as const,
    reason: params.reason ?? null,
    notes: params.notes ?? null,
    visit_fee: params.visitFee ?? null,
    follow_up_visit_id: params.fromVisitId,
  };

  const { data, error } = await supabase
    .from("appointments")
    .insert(payload)
    .select("*")
    .single();

  return {
    data: (data as Appointment) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export function useFollowUpSuggestion(
  doctorId: string | null | undefined,
  diagnosis: string | null | undefined,
  visitDate: string | null | undefined
) {
  const [suggestion, setSuggestion] = useState<FollowUpSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!doctorId || !diagnosis || !visitDate) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    buildFollowUpSuggestion({ doctorId, diagnosis, visitDate })
      .then((s) => {
        if (!cancelled) setSuggestion(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId, diagnosis, visitDate]);

  const schedule = useCallback(
    async (override?: Partial<ScheduleFollowUpParams>) => {
      if (!suggestion || !doctorId) {
        return { data: null, error: new Error("No suggestion available") };
      }
      const base: ScheduleFollowUpParams = {
        doctorId,
        patientId: override?.patientId ?? "",
        fromVisitId: override?.fromVisitId ?? null,
        date: override?.date ?? suggestion.suggestedDate,
        time: override?.time ?? suggestion.suggestedTime,
        durationMinutes: override?.durationMinutes,
        reason: override?.reason ?? suggestion.protocol.condition_name,
        notes: override?.notes ?? suggestion.protocol.notes,
        visitFee: override?.visitFee ?? null,
      };
      if (!base.patientId) {
        return { data: null, error: new Error("patientId required") };
      }
      return scheduleFollowUpAppointment(base);
    },
    [suggestion, doctorId]
  );

  return { suggestion, loading, error, schedule };
}
