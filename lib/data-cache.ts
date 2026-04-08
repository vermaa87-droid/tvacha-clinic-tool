"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabase";

// ─── Cache entry with timestamp ─────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const STALE_TIME = 60_000; // 60 seconds

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.timestamp < STALE_TIME;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PatientRow {
  id: string;
  name: string;
  patient_display_id: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  chief_complaint: string | null;
  current_diagnosis: string | null;
  treatment_status: string | null;
  severity: string | null;
  total_visits: number | null;
  last_visit_date: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface AppointmentRow {
  id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number | null;
  type: string | null;
  status: string | null;
  reason: string | null;
  visit_fee: number | null;
  [key: string]: unknown;
}

interface PrescriptionRow {
  id: string;
  patient_id: string;
  diagnosis: string;
  medicines: unknown[];
  special_instructions: string | null;
  follow_up_date: string | null;
  status: string;
  pdf_url: string | null;
  created_at: string;
  [key: string]: unknown;
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface DataCacheState {
  // Cached data
  patients: CacheEntry<PatientRow[]> | null;
  appointments: CacheEntry<AppointmentRow[]> | null;
  prescriptions: CacheEntry<PrescriptionRow[]> | null;

  // Loading flags
  loadingPatients: boolean;
  loadingAppointments: boolean;
  loadingPrescriptions: boolean;

  // Actions
  fetchPatients: (userId: string, force?: boolean) => Promise<PatientRow[]>;
  fetchAppointments: (userId: string, force?: boolean) => Promise<AppointmentRow[]>;
  fetchPrescriptions: (userId: string, force?: boolean) => Promise<PrescriptionRow[]>;
  prefetchAll: (userId: string) => void;
  invalidatePatients: () => void;
  invalidateAppointments: () => void;
  invalidatePrescriptions: () => void;
  invalidateAll: () => void;
}

export const useDataCache = create<DataCacheState>((set, get) => ({
  patients: null,
  appointments: null,
  prescriptions: null,
  loadingPatients: false,
  loadingAppointments: false,
  loadingPrescriptions: false,

  fetchPatients: async (userId, force = false) => {
    const cached = get().patients;
    if (!force && isFresh(cached)) return cached.data;

    // Return stale data immediately while refetching
    if (cached && !force) {
      // Background refetch
      (async () => {
        set({ loadingPatients: true });
        const { data } = await supabase
          .from("patients")
          .select("id, name, patient_display_id, age, gender, phone, chief_complaint, current_diagnosis, treatment_status, severity, total_visits, last_visit_date, created_at, updated_at")
          .eq("linked_doctor_id", userId)
          .neq("treatment_status", "pending_diagnosis")
          .order("updated_at", { ascending: false })
          .limit(100);
        if (data) set({ patients: { data: data as PatientRow[], timestamp: Date.now() } });
        set({ loadingPatients: false });
      })();
      return cached.data;
    }

    set({ loadingPatients: true });
    const { data } = await supabase
      .from("patients")
      .select("id, name, patient_display_id, age, gender, phone, chief_complaint, current_diagnosis, treatment_status, severity, total_visits, last_visit_date, created_at, updated_at")
      .eq("linked_doctor_id", userId)
      .neq("treatment_status", "pending_diagnosis")
      .order("updated_at", { ascending: false })
      .limit(100);
    const rows = (data ?? []) as PatientRow[];
    set({ patients: { data: rows, timestamp: Date.now() }, loadingPatients: false });
    return rows;
  },

  fetchAppointments: async (userId, force = false) => {
    const cached = get().appointments;
    if (!force && isFresh(cached)) return cached.data;

    if (cached && !force) {
      (async () => {
        set({ loadingAppointments: true });
        const { data } = await supabase
          .from("appointments")
          .select("id, patient_id, appointment_date, appointment_time, duration_minutes, type, status, reason, visit_fee, created_at, patients(name)")
          .eq("doctor_id", userId)
          .order("appointment_date", { ascending: false })
          .limit(100);
        if (data) set({ appointments: { data: data as AppointmentRow[], timestamp: Date.now() } });
        set({ loadingAppointments: false });
      })();
      return cached.data;
    }

    set({ loadingAppointments: true });
    const { data } = await supabase
      .from("appointments")
      .select("id, patient_id, appointment_date, appointment_time, duration_minutes, type, status, reason, visit_fee, created_at, patients(name)")
      .eq("doctor_id", userId)
      .order("appointment_date", { ascending: false })
      .limit(100);
    const rows = (data ?? []) as AppointmentRow[];
    set({ appointments: { data: rows, timestamp: Date.now() }, loadingAppointments: false });
    return rows;
  },

  fetchPrescriptions: async (userId, force = false) => {
    const cached = get().prescriptions;
    if (!force && isFresh(cached)) return cached.data;

    if (cached && !force) {
      (async () => {
        set({ loadingPrescriptions: true });
        const { data } = await supabase
          .from("prescriptions")
          .select("id, patient_id, diagnosis, medicines, special_instructions, follow_up_date, status, pdf_url, created_at, patients(name)")
          .eq("doctor_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (data) set({ prescriptions: { data: data as PrescriptionRow[], timestamp: Date.now() } });
        set({ loadingPrescriptions: false });
      })();
      return cached.data;
    }

    set({ loadingPrescriptions: true });
    const { data } = await supabase
      .from("prescriptions")
      .select("id, patient_id, diagnosis, medicines, special_instructions, follow_up_date, status, pdf_url, created_at, patients(name)")
      .eq("doctor_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data ?? []) as PrescriptionRow[];
    set({ prescriptions: { data: rows, timestamp: Date.now() }, loadingPrescriptions: false });
    return rows;
  },

  prefetchAll: (userId) => {
    const { fetchPatients, fetchAppointments, fetchPrescriptions } = get();
    // Fire all three in parallel, don't await
    fetchPatients(userId);
    fetchAppointments(userId);
    fetchPrescriptions(userId);
  },

  invalidatePatients: () => set({ patients: null }),
  invalidateAppointments: () => set({ appointments: null }),
  invalidatePrescriptions: () => set({ prescriptions: null }),
  invalidateAll: () => set({ patients: null, appointments: null, prescriptions: null }),
}));
