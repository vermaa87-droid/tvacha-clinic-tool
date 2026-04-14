"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  findFirstAvailableSlot,
  scheduleFollowUpAppointment,
} from "./useFollowUpSuggestion";
import type { Appointment, PackageSession, PatientPackage } from "./types";

const DEFAULT_SLOT_MINUTES = 15;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface RecordSessionParams {
  doctorId: string;
  packageId: string;
  sessionNumber: number;
  sessionDate?: string;
  notes?: string | null;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  performedBy?: string | null;
  appointmentId?: string | null;
}

export interface RecordSessionResult {
  session: PackageSession | null;
  updatedPackage: PatientPackage | null;
  nextAppointment: Appointment | null;
  error: Error | null;
}

/**
 * Record a package session, decrement the patient_package counter, auto-schedule
 * the next session's appointment if the package has more sessions and is not
 * expired, and mark the package completed when total_sessions is reached.
 *
 * All Supabase queries include doctor_id — RLS will reject otherwise.
 */
export async function recordPackageSession(
  params: RecordSessionParams
): Promise<RecordSessionResult> {
  const {
    doctorId,
    packageId,
    sessionNumber,
    sessionDate = todayIso(),
    notes = null,
    beforePhotoUrl = null,
    afterPhotoUrl = null,
    performedBy = null,
    appointmentId = null,
  } = params;

  if (!doctorId || !packageId) {
    return {
      session: null,
      updatedPackage: null,
      nextAppointment: null,
      error: new Error("doctorId and packageId are required"),
    };
  }

  const { data: pkg, error: pkgErr } = await supabase
    .from("patient_packages")
    .select(
      "id, patient_id, doctor_id, template_id, package_name, total_sessions, sessions_completed, total_price, amount_paid, start_date, expiry_date, status, notes, created_at, updated_at"
    )
    .eq("id", packageId)
    .eq("doctor_id", doctorId)
    .maybeSingle();

  if (pkgErr || !pkg) {
    return {
      session: null,
      updatedPackage: null,
      nextAppointment: null,
      error: pkgErr
        ? new Error(pkgErr.message)
        : new Error("Package not found"),
    };
  }

  const pkgRow = pkg as PatientPackage;

  if (pkgRow.status !== "active") {
    return {
      session: null,
      updatedPackage: pkgRow,
      nextAppointment: null,
      error: new Error(`Package is ${pkgRow.status}, cannot record session`),
    };
  }

  if (sessionDate > pkgRow.expiry_date) {
    return {
      session: null,
      updatedPackage: pkgRow,
      nextAppointment: null,
      error: new Error("Session date is after package expiry"),
    };
  }

  if (sessionNumber > pkgRow.total_sessions) {
    return {
      session: null,
      updatedPackage: pkgRow,
      nextAppointment: null,
      error: new Error("session_number exceeds total_sessions"),
    };
  }

  if (sessionNumber <= pkgRow.sessions_completed) {
    return {
      session: null,
      updatedPackage: pkgRow,
      nextAppointment: null,
      error: new Error("This session number has already been recorded"),
    };
  }

  const { data: sessionInsert, error: sessionErr } = await supabase
    .from("package_sessions")
    .insert({
      package_id: packageId,
      doctor_id: doctorId,
      session_number: sessionNumber,
      session_date: sessionDate,
      appointment_id: appointmentId,
      notes,
      before_photo_url: beforePhotoUrl,
      after_photo_url: afterPhotoUrl,
      performed_by: performedBy,
    })
    .select("*")
    .single();

  if (sessionErr || !sessionInsert) {
    return {
      session: null,
      updatedPackage: pkgRow,
      nextAppointment: null,
      error: sessionErr
        ? new Error(sessionErr.message)
        : new Error("Failed to insert session"),
    };
  }

  const newCompleted = pkgRow.sessions_completed + 1;
  const reachedTotal = newCompleted >= pkgRow.total_sessions;

  const { data: updated, error: updateErr } = await supabase
    .from("patient_packages")
    .update({
      sessions_completed: newCompleted,
      status: reachedTotal ? "completed" : pkgRow.status,
    })
    .eq("id", packageId)
    .eq("doctor_id", doctorId)
    .select("*")
    .single();

  if (updateErr) {
    return {
      session: sessionInsert as PackageSession,
      updatedPackage: pkgRow,
      nextAppointment: null,
      error: new Error(updateErr.message),
    };
  }

  const updatedPkg = (updated as PatientPackage) ?? pkgRow;

  if (reachedTotal) {
    return {
      session: sessionInsert as PackageSession,
      updatedPackage: updatedPkg,
      nextAppointment: null,
      error: null,
    };
  }

  const nextAppt = await scheduleNextPackageAppointment({
    doctorId,
    pkg: updatedPkg,
    fromSessionDate: sessionDate,
  });

  return {
    session: sessionInsert as PackageSession,
    updatedPackage: updatedPkg,
    nextAppointment: nextAppt.data,
    error: nextAppt.error,
  };
}

interface ScheduleNextParams {
  doctorId: string;
  pkg: PatientPackage;
  fromSessionDate: string;
}

export async function scheduleNextPackageAppointment(
  params: ScheduleNextParams
): Promise<{ data: Appointment | null; error: Error | null }> {
  const { doctorId, pkg, fromSessionDate } = params;

  if (pkg.sessions_completed >= pkg.total_sessions) {
    return { data: null, error: null };
  }

  const tmpl = await supabase
    .from("package_templates")
    .select("session_interval_days")
    .eq("id", pkg.template_id ?? "")
    .eq("doctor_id", doctorId)
    .maybeSingle();

  const intervalDays =
    (tmpl.data?.session_interval_days as number | undefined) ?? 28;

  let nextDate = addDays(fromSessionDate, intervalDays);
  if (nextDate > pkg.expiry_date) {
    nextDate = pkg.expiry_date;
  }

  const nextTime = await findFirstAvailableSlot(doctorId, nextDate);

  const reason = `${pkg.package_name} — session ${pkg.sessions_completed + 1} of ${pkg.total_sessions}`;

  return scheduleFollowUpAppointment({
    doctorId,
    patientId: pkg.patient_id,
    fromVisitId: null,
    date: nextDate,
    time: nextTime,
    durationMinutes: DEFAULT_SLOT_MINUTES,
    reason,
    notes: `Auto-scheduled from package ${pkg.id}`,
    visitFee: null,
  });
}

/**
 * Mark all active packages whose expiry_date < today as expired.
 * Safe to call repeatedly. Always scoped to the given doctor.
 */
export async function expireOverduePackages(
  doctorId: string
): Promise<{ count: number; error: Error | null }> {
  if (!doctorId) {
    return { count: 0, error: new Error("doctorId required") };
  }
  const today = todayIso();
  const { data, error } = await supabase
    .from("patient_packages")
    .update({ status: "expired" })
    .eq("doctor_id", doctorId)
    .eq("status", "active")
    .lt("expiry_date", today)
    .select("id");

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }
  return { count: (data ?? []).length, error: null };
}

export interface PackageProgress {
  pkg: PatientPackage;
  remainingSessions: number;
  percentComplete: number;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
  nextSessionNumber: number;
}

function summarizeProgress(pkg: PatientPackage): PackageProgress {
  const remainingSessions = Math.max(
    0,
    pkg.total_sessions - pkg.sessions_completed
  );
  const percentComplete =
    pkg.total_sessions > 0
      ? Math.round((pkg.sessions_completed / pkg.total_sessions) * 100)
      : 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilExpiry = Math.floor(
    (new Date(`${pkg.expiry_date}T00:00:00`).getTime() -
      new Date(`${todayIso()}T00:00:00`).getTime()) /
      msPerDay
  );
  return {
    pkg,
    remainingSessions,
    percentComplete,
    daysUntilExpiry,
    isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 14,
    nextSessionNumber: pkg.sessions_completed + 1,
  };
}

export function usePackageSession(
  doctorId: string | null | undefined,
  packageId: string | null | undefined
) {
  const [pkg, setPkg] = useState<PatientPackage | null>(null);
  const [sessions, setSessions] = useState<PackageSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!doctorId || !packageId) return;
    setLoading(true);
    setError(null);
    const [pkgRes, sessionRes] = await Promise.all([
      supabase
        .from("patient_packages")
        .select("*")
        .eq("id", packageId)
        .eq("doctor_id", doctorId)
        .maybeSingle(),
      supabase
        .from("package_sessions")
        .select("*")
        .eq("package_id", packageId)
        .eq("doctor_id", doctorId)
        .order("session_number", { ascending: true }),
    ]);
    if (pkgRes.error) {
      setError(new Error(pkgRes.error.message));
    } else {
      setPkg((pkgRes.data as PatientPackage) ?? null);
    }
    if (sessionRes.error) {
      setError(new Error(sessionRes.error.message));
    } else {
      setSessions((sessionRes.data as PackageSession[]) ?? []);
    }
    setLoading(false);
  }, [doctorId, packageId]);

  useEffect(() => {
    if (!doctorId || !packageId) {
      setPkg(null);
      setSessions([]);
      return;
    }
    refresh();
  }, [doctorId, packageId, refresh]);

  const record = useCallback(
    async (
      input: Omit<RecordSessionParams, "doctorId" | "packageId" | "sessionNumber"> & {
        sessionNumber?: number;
      }
    ) => {
      if (!doctorId || !packageId || !pkg) {
        return {
          session: null,
          updatedPackage: null,
          nextAppointment: null,
          error: new Error("Package not loaded"),
        } satisfies RecordSessionResult;
      }
      const result = await recordPackageSession({
        doctorId,
        packageId,
        sessionNumber: input.sessionNumber ?? pkg.sessions_completed + 1,
        ...input,
      });
      await refresh();
      return result;
    },
    [doctorId, packageId, pkg, refresh]
  );

  const progress = pkg ? summarizeProgress(pkg) : null;

  return { pkg, sessions, progress, loading, error, refresh, record };
}

export function getPackageProgress(pkg: PatientPackage): PackageProgress {
  return summarizeProgress(pkg);
}
