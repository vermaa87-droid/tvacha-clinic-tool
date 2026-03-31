"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, EditableCell } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Prescription } from "@/lib/types";
import Link from "next/link";
import { Pencil, Plus, Phone } from "lucide-react";
import {
  SEVERITY_OPTIONS,
  SEVERITY_COLORS,
  TREATMENT_STATUS_OPTIONS,
  TREATMENT_STATUS_COLORS,
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  FITZPATRICK_OPTIONS,
  BODY_LOCATIONS,
  VISIT_TYPE_OPTIONS,
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_STATUS_COLORS,
  TREATMENT_RESPONSE_OPTIONS,
  COMPLIANCE_OPTIONS,
  TREATMENT_PLAN_STATUS_OPTIONS,
} from "@/lib/constants";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PatientRow extends Record<string, unknown> {
  id: string;
  patient_display_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  chief_complaint: string | null;
  current_diagnosis: string | null;
  severity: string | null;
  treatment_status: string | null;
  last_visit_date: string | null;
  next_followup_date: string | null;
  total_visits: number | null;
  city: string | null;
}

interface VisitRow extends Record<string, unknown> {
  id: string;
  visit_date: string;
  patient_name: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  severity: string | null;
  body_location: string | null;
  treatment_given: string | null;
  visit_fee: number | null;
  duration_minutes: number | null;
  doctor_notes: string | null;
}

interface TreatmentPlanRow extends Record<string, unknown> {
  id: string;
  patient_name: string;
  condition: string | null;
  treatment_started: string | null;
  treatment_plan: string | null;
  response: string | null;
  side_effects: string | null;
  status: string | null;
  compliance: string | null;
  next_assessment: string | null;
}

interface MedicationRow extends Record<string, unknown> {
  prescription_id: string;
  created_at: string;
  patient_name: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  diagnosis: string;
  status: string;
}

interface AppointmentRow extends Record<string, unknown> {
  id: string;
  appointment_date: string;
  appointment_time: string;
  patient_name: string;
  type: string | null;
  duration_minutes: number | null;
  reason: string | null;
  status: string | null;
  visit_fee: number | null;
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "patients", label: "Patient Register" },
  { key: "visits", label: "Visit Log" },
  { key: "treatments", label: "Treatment Tracker" },
  { key: "medications", label: "Medication Log" },
  { key: "appointments", label: "Appointments" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Page Component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>("patients");

  // Loading states
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [loadingTreatments, setLoadingTreatments] = useState(true);
  const [loadingMedications, setLoadingMedications] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  // Data states
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlanRow[]>([]);
  const [medications, setMedications] = useState<MedicationRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  // Patient list for dropdowns in modals
  const [patientList, setPatientList] = useState<{ id: string; name: string }[]>([]);

  // Pagination
  const [patientPageSize, setPatientPageSize] = useState(25);

  // Modal states
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoadingPatients(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("linked_doctor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setPatients(data as unknown as PatientRow[]);
        setPatientList(data.map((p: Record<string, unknown>) => ({ id: p.id as string, name: p.name as string })));
      }
    } catch (err) {
      console.error("[register] fetch patients error:", err);
    } finally {
      setLoadingPatients(false);
    }
  }, [user]);

  const fetchVisits = useCallback(async () => {
    if (!user) return;
    setLoadingVisits(true);
    try {
      const { data, error } = await supabase
        .from("visits")
        .select("*, patients(name)")
        .eq("doctor_id", user.id)
        .order("visit_date", { ascending: false });
      if (error) throw error;
      if (data) {
        setVisits(
          data.map((v: Record<string, unknown>) => ({
            ...v,
            patient_name: (v.patients as { name: string } | null)?.name || "Unknown",
            treatment_given: Array.isArray(v.treatment_given)
              ? (v.treatment_given as string[]).join(", ")
              : (v.treatment_given as string) || "",
          })) as unknown as VisitRow[]
        );
      }
    } catch (err) {
      console.error("[register] fetch visits error:", err);
    } finally {
      setLoadingVisits(false);
    }
  }, [user]);

  const fetchTreatmentPlans = useCallback(async () => {
    if (!user) return;
    setLoadingTreatments(true);
    try {
      const { data, error } = await supabase
        .from("treatment_plans")
        .select("*, patients(name)")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setTreatmentPlans(
          data.map((t: Record<string, unknown>) => ({
            ...t,
            patient_name: (t.patients as { name: string } | null)?.name || "Unknown",
          })) as unknown as TreatmentPlanRow[]
        );
      }
    } catch (err) {
      console.error("[register] fetch treatment plans error:", err);
    } finally {
      setLoadingTreatments(false);
    }
  }, [user]);

  const fetchMedications = useCallback(async () => {
    if (!user) return;
    setLoadingMedications(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patients(name)")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        const rows: MedicationRow[] = [];
        for (const rx of data as unknown as (Prescription & { patients?: { name: string } })[]) {
          const patientName = rx.patients?.name || "Unknown";
          if (Array.isArray(rx.medicines)) {
            for (const med of rx.medicines) {
              rows.push({
                prescription_id: rx.id,
                created_at: rx.created_at?.split("T")[0] || "",
                patient_name: patientName,
                medicine_name: med.name || "",
                dosage: med.dosage || "",
                frequency: med.frequency || "",
                duration: med.duration || "",
                diagnosis: rx.diagnosis || "",
                status: rx.status || "",
              });
            }
          }
        }
        setMedications(rows);
      }
    } catch (err) {
      console.error("[register] fetch medications error:", err);
    } finally {
      setLoadingMedications(false);
    }
  }, [user]);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoadingAppointments(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(name)")
        .eq("doctor_id", user.id)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      if (data) {
        setAppointments(
          data.map((a: Record<string, unknown>) => ({
            ...a,
            patient_name: (a.patients as { name: string } | null)?.name || "Unknown",
          })) as unknown as AppointmentRow[]
        );
      }
    } catch (err) {
      console.error("[register] fetch appointments error:", err);
    } finally {
      setLoadingAppointments(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchPatients();
    fetchVisits();
    fetchTreatmentPlans();
    fetchMedications();
    fetchAppointments();
  }, [user, fetchPatients, fetchVisits, fetchTreatmentPlans, fetchMedications, fetchAppointments]);

  // ─── Cell Edit Handlers ────────────────────────────────────────────────────

  const handlePatientCellEdit = useCallback(
    async (rowIndex: number, columnId: string, value: unknown) => {
      const row = patients[rowIndex];
      if (!row) return;
      try {
        const { error } = await supabase
          .from("patients")
          .update({ [columnId]: value })
          .eq("id", row.id);
        if (error) throw error;
        setPatients((prev) =>
          prev.map((p, i) => (i === rowIndex ? { ...p, [columnId]: value } : p))
        );
      } catch (err) {
        console.error("[register] update patient error:", err);
      }
    },
    [patients]
  );

  const handleVisitCellEdit = useCallback(
    async (rowIndex: number, columnId: string, value: unknown) => {
      const row = visits[rowIndex];
      if (!row) return;
      try {
        const { error } = await supabase
          .from("visits")
          .update({ [columnId]: value })
          .eq("id", row.id);
        if (error) throw error;
        setVisits((prev) =>
          prev.map((v, i) => (i === rowIndex ? { ...v, [columnId]: value } : v))
        );
      } catch (err) {
        console.error("[register] update visit error:", err);
      }
    },
    [visits]
  );

  const handleTreatmentCellEdit = useCallback(
    async (rowIndex: number, columnId: string, value: unknown) => {
      const row = treatmentPlans[rowIndex];
      if (!row) return;
      try {
        const { error } = await supabase
          .from("treatment_plans")
          .update({ [columnId]: value })
          .eq("id", row.id);
        if (error) throw error;
        setTreatmentPlans((prev) =>
          prev.map((t, i) => (i === rowIndex ? { ...t, [columnId]: value } : t))
        );
      } catch (err) {
        console.error("[register] update treatment plan error:", err);
      }
    },
    [treatmentPlans]
  );

  const handleAppointmentCellEdit = useCallback(
    async (rowIndex: number, columnId: string, value: unknown) => {
      const row = appointments[rowIndex];
      if (!row) return;
      try {
        const { error } = await supabase
          .from("appointments")
          .update({ [columnId]: value })
          .eq("id", row.id);
        if (error) throw error;
        setAppointments((prev) =>
          prev.map((a, i) => (i === rowIndex ? { ...a, [columnId]: value } : a))
        );
      } catch (err) {
        console.error("[register] update appointment error:", err);
      }
    },
    [appointments]
  );

  // ─── Column Definitions ───────────────────────────────────────────────────

  const patientColumns = useMemo<ColumnDef<PatientRow, unknown>[]>(
    () => [
      {
        id: "sno",
        header: "S.No",
        cell: ({ row }) => row.index + 1,
      },
      { accessorKey: "patient_display_id", header: "Patient ID" },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/dashboard/patients/${row.original.id}`}
            className="text-primary-500 hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "age_gender",
        header: "Age/Gender",
        cell: ({ row }) => {
          const age = row.original.age ?? "";
          const g = row.original.gender;
          const gShort = g === "Male" ? "M" : g === "Female" ? "F" : g === "Other" ? "O" : g ? g.charAt(0).toUpperCase() : "";
          return age || gShort ? `${age}/${gShort}` : "";
        },
      },
      { accessorKey: "phone", header: "Phone" },
      { accessorKey: "chief_complaint", header: "Chief Complaint" },
      { accessorKey: "current_diagnosis", header: "Diagnosis" },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.severity}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "severity", val)}
            type="select"
            options={SEVERITY_OPTIONS}
            colorMap={SEVERITY_COLORS}
          />
        ),
      },
      {
        accessorKey: "treatment_status",
        header: "Status",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.treatment_status}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "treatment_status", val)}
            type="select"
            options={TREATMENT_STATUS_OPTIONS}
            colorMap={TREATMENT_STATUS_COLORS}
          />
        ),
      },
      { accessorKey: "last_visit_date", header: "Last Visit" },
      {
        accessorKey: "next_followup_date",
        header: "Next Follow-up",
        cell: ({ row }) => {
          const date = row.original.next_followup_date;
          if (!date) return "";
          const isOverdue = new Date(date) < new Date(new Date().toISOString().split("T")[0]);
          return (
            <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
              {date}
            </span>
          );
        },
      },
      { accessorKey: "total_visits", header: "Total Visits" },
      { accessorKey: "city", header: "City" },
      {
        id: "quick_actions",
        header: "Quick Actions",
        cell: ({ row }) => (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              title="Edit patient"
              className="p-1 rounded hover:bg-primary-100 text-text-muted hover:text-primary-500"
              onClick={() => {
                const p = row.original;
                setPatientForm({
                  name: p.name || "",
                  age: p.age != null ? String(p.age) : "",
                  gender: p.gender || "",
                  phone: p.phone || "",
                  email: "",
                  blood_group: "",
                  fitzpatrick_type: "",
                  chief_complaint: p.chief_complaint || "",
                  city: p.city || "",
                  state: "",
                  allergies: "",
                  chronic_conditions: "",
                  family_history: "",
                });
                setShowAddPatient(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <Link
              title="New visit"
              href={`/dashboard/patients/${row.original.id}`}
              className="p-1 rounded hover:bg-primary-100 text-text-muted hover:text-primary-500"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
            {row.original.phone && (
              <a
                title="Call patient"
                href={`tel:${row.original.phone}`}
                className="p-1 rounded hover:bg-primary-100 text-text-muted hover:text-primary-500"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const visitColumns = useMemo<ColumnDef<VisitRow, unknown>[]>(
    () => [
      { accessorKey: "visit_date", header: "Date" },
      { accessorKey: "patient_name", header: "Patient" },
      { accessorKey: "chief_complaint", header: "Chief Complaint" },
      { accessorKey: "diagnosis", header: "Diagnosis" },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.severity}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "severity", val)}
            type="select"
            options={SEVERITY_OPTIONS}
            colorMap={SEVERITY_COLORS}
          />
        ),
      },
      { accessorKey: "body_location", header: "Body Location" },
      { accessorKey: "treatment_given", header: "Treatment Given" },
      { accessorKey: "visit_fee", header: "Fee" },
      { accessorKey: "duration_minutes", header: "Duration (min)" },
      { accessorKey: "doctor_notes", header: "Notes" },
    ],
    []
  );

  const treatmentColumns = useMemo<ColumnDef<TreatmentPlanRow, unknown>[]>(
    () => [
      { accessorKey: "patient_name", header: "Patient" },
      { accessorKey: "condition", header: "Condition" },
      { accessorKey: "treatment_started", header: "Started" },
      { accessorKey: "treatment_plan", header: "Plan" },
      {
        accessorKey: "response",
        header: "Response",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.response}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "response", val)}
            type="select"
            options={TREATMENT_RESPONSE_OPTIONS}
          />
        ),
      },
      { accessorKey: "side_effects", header: "Side Effects" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.status}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "status", val)}
            type="select"
            options={TREATMENT_PLAN_STATUS_OPTIONS}
          />
        ),
      },
      {
        accessorKey: "compliance",
        header: "Compliance",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.compliance}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "compliance", val)}
            type="select"
            options={COMPLIANCE_OPTIONS}
          />
        ),
      },
      { accessorKey: "next_assessment", header: "Next Assessment" },
    ],
    []
  );

  const medicationColumns = useMemo<ColumnDef<MedicationRow, unknown>[]>(
    () => [
      { accessorKey: "created_at", header: "Date" },
      { accessorKey: "patient_name", header: "Patient" },
      { accessorKey: "medicine_name", header: "Medicine" },
      { accessorKey: "dosage", header: "Dosage" },
      { accessorKey: "frequency", header: "Frequency" },
      { accessorKey: "duration", header: "Duration" },
      { accessorKey: "diagnosis", header: "Diagnosis" },
      { accessorKey: "status", header: "Status" },
    ],
    []
  );

  const appointmentColumns = useMemo<ColumnDef<AppointmentRow, unknown>[]>(
    () => [
      { accessorKey: "appointment_date", header: "Date" },
      { accessorKey: "appointment_time", header: "Time" },
      { accessorKey: "patient_name", header: "Patient" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.type}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "type", val)}
            type="select"
            options={VISIT_TYPE_OPTIONS}
          />
        ),
      },
      { accessorKey: "duration_minutes", header: "Duration (min)" },
      { accessorKey: "reason", header: "Reason" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.status}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "status", val)}
            type="select"
            options={APPOINTMENT_STATUS_OPTIONS}
            colorMap={APPOINTMENT_STATUS_COLORS}
          />
        ),
      },
      { accessorKey: "visit_fee", header: "Fee" },
    ],
    []
  );

  // ─── Add Patient Form ─────────────────────────────────────────────────────

  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    blood_group: "",
    fitzpatrick_type: "",
    chief_complaint: "",
    city: "",
    state: "",
    allergies: "",
    chronic_conditions: "",
    family_history: "",
  });

  const handleAddPatient = async () => {
    if (!user || !patientForm.name || !patientForm.age || !patientForm.gender || !patientForm.chief_complaint) return;
    setSubmitting(true);
    try {
      const displayId = `TVP-${String(patients.length + 1).padStart(4, "0")}`;
      const medicalHistory: Record<string, unknown> = {};
      if (patientForm.chronic_conditions) medicalHistory.chronic_conditions = patientForm.chronic_conditions;
      if (patientForm.family_history) medicalHistory.family_history = patientForm.family_history;

      const { error } = await supabase.from("patients").insert({
        linked_doctor_id: user.id,
        patient_display_id: displayId,
        name: patientForm.name,
        age: parseInt(patientForm.age),
        gender: patientForm.gender,
        phone: patientForm.phone || null,
        email: patientForm.email || null,
        blood_group: patientForm.blood_group || null,
        fitzpatrick_type: patientForm.fitzpatrick_type ? parseInt(patientForm.fitzpatrick_type) : null,
        chief_complaint: patientForm.chief_complaint,
        city: patientForm.city || null,
        state: patientForm.state || null,
        allergies: patientForm.allergies ? patientForm.allergies.split(",").map((a) => a.trim()) : null,
        medical_history: Object.keys(medicalHistory).length > 0 ? medicalHistory : {},
      });
      if (error) throw error;
      setShowAddPatient(false);
      setPatientForm({ name: "", age: "", gender: "", phone: "", email: "", blood_group: "", fitzpatrick_type: "", chief_complaint: "", city: "", state: "", allergies: "", chronic_conditions: "", family_history: "" });
      fetchPatients();
    } catch (err) {
      console.error("[register] add patient error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add Visit Form ───────────────────────────────────────────────────────

  const [visitForm, setVisitForm] = useState({
    patient_id: "",
    visit_date: new Date().toISOString().split("T")[0],
    chief_complaint: "",
    diagnosis: "",
    severity: "",
    body_location: "",
    visit_fee: "",
    duration_minutes: "",
    doctor_notes: "",
  });

  const handleAddVisit = async () => {
    if (!user || !visitForm.patient_id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("visits").insert({
        doctor_id: user.id,
        patient_id: visitForm.patient_id,
        visit_date: visitForm.visit_date,
        chief_complaint: visitForm.chief_complaint || null,
        diagnosis: visitForm.diagnosis || null,
        severity: visitForm.severity || null,
        body_location: visitForm.body_location || null,
        visit_fee: visitForm.visit_fee ? parseFloat(visitForm.visit_fee) : null,
        duration_minutes: visitForm.duration_minutes ? parseInt(visitForm.duration_minutes) : null,
        doctor_notes: visitForm.doctor_notes || null,
      });
      if (error) throw error;

      // Update patient's last_visit_date and increment total_visits
      const patient = patients.find((p) => p.id === visitForm.patient_id);
      if (patient) {
        await supabase
          .from("patients")
          .update({
            last_visit_date: visitForm.visit_date,
            total_visits: ((patient.total_visits as number) || 0) + 1,
          })
          .eq("id", visitForm.patient_id);
      }

      setShowAddVisit(false);
      setVisitForm({ patient_id: "", visit_date: new Date().toISOString().split("T")[0], chief_complaint: "", diagnosis: "", severity: "", body_location: "", visit_fee: "", duration_minutes: "", doctor_notes: "" });
      fetchVisits();
      fetchPatients();
    } catch (err) {
      console.error("[register] add visit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add Treatment Plan Form ───────────────────────────────────────────────

  const [treatmentForm, setTreatmentForm] = useState({
    patient_id: "",
    condition: "",
    treatment_plan: "",
    next_assessment: "",
  });

  const handleAddTreatment = async () => {
    if (!user || !treatmentForm.patient_id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("treatment_plans").insert({
        doctor_id: user.id,
        patient_id: treatmentForm.patient_id,
        condition: treatmentForm.condition || null,
        treatment_plan: treatmentForm.treatment_plan || null,
        treatment_started: new Date().toISOString().split("T")[0],
        next_assessment: treatmentForm.next_assessment || null,
        status: "ongoing",
      });
      if (error) throw error;
      setShowAddTreatment(false);
      setTreatmentForm({ patient_id: "", condition: "", treatment_plan: "", next_assessment: "" });
      fetchTreatmentPlans();
    } catch (err) {
      console.error("[register] add treatment plan error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add Appointment Form ─────────────────────────────────────────────────

  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: "",
    appointment_date: "",
    appointment_time: "",
    type: "",
    duration_minutes: "30",
    reason: "",
    visit_fee: "",
  });

  const handleAddAppointment = async () => {
    if (!user || !appointmentForm.patient_id || !appointmentForm.appointment_date) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        doctor_id: user.id,
        patient_id: appointmentForm.patient_id,
        appointment_date: appointmentForm.appointment_date,
        appointment_time: appointmentForm.appointment_time || null,
        type: appointmentForm.type || null,
        duration_minutes: parseInt(appointmentForm.duration_minutes),
        reason: appointmentForm.reason || null,
        visit_fee: appointmentForm.visit_fee ? parseFloat(appointmentForm.visit_fee) : null,
        status: "scheduled",
      });
      if (error) throw error;
      setShowAddAppointment(false);
      setAppointmentForm({ patient_id: "", appointment_date: "", appointment_time: "", type: "", duration_minutes: "30", reason: "", visit_fee: "" });
      fetchAppointments();
    } catch (err) {
      console.error("[register] add appointment error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-text-primary">Clinic Register</h1>
        <p className="text-text-muted mt-1">Manage patients, visits, treatments, medications, and appointments</p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-primary-200 overflow-x-auto">
        <nav className="flex gap-0 -mb-px whitespace-nowrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-b-2 border-primary-500 text-primary-500"
                  : "text-text-muted hover:text-text-secondary hover:border-b-2 hover:border-primary-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "patients" && (
        <div>
          <DataTable<PatientRow>
            data={patients}
            columns={patientColumns}
            onCellEdit={handlePatientCellEdit}
            onAddRow={() => setShowAddPatient(true)}
            addRowLabel="Add Patient"
            searchPlaceholder="Search patients..."
            exportFilename="patient-register"
            loading={loadingPatients}
            emptyMessage="No patients registered yet"
            emptyAction="Add your first patient"
            pageSize={patientPageSize}
          />
          <div className="flex items-center gap-2 mt-2 text-sm text-text-muted">
            <span>Rows per page:</span>
            <select
              value={patientPageSize}
              onChange={(e) => setPatientPageSize(Number(e.target.value))}
              className="px-2 py-1 border border-primary-200 rounded bg-surface text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {activeTab === "visits" && (
        <DataTable<VisitRow>
          data={visits}
          columns={visitColumns}
          onCellEdit={handleVisitCellEdit}
          onAddRow={() => setShowAddVisit(true)}
          addRowLabel="Log Visit"
          searchPlaceholder="Search visits..."
          exportFilename="visit-log"
          loading={loadingVisits}
          emptyMessage="No visits logged yet"
          emptyAction="Log your first visit"
        />
      )}

      {activeTab === "treatments" && (
        <DataTable<TreatmentPlanRow>
          data={treatmentPlans}
          columns={treatmentColumns}
          onCellEdit={handleTreatmentCellEdit}
          onAddRow={() => setShowAddTreatment(true)}
          addRowLabel="Add Treatment Plan"
          searchPlaceholder="Search treatment plans..."
          exportFilename="treatment-tracker"
          loading={loadingTreatments}
          emptyMessage="No treatment plans yet"
          emptyAction="Add your first treatment plan"
        />
      )}

      {activeTab === "medications" && (
        <DataTable<MedicationRow>
          data={medications}
          columns={medicationColumns}
          searchPlaceholder="Search medications..."
          exportFilename="medication-log"
          loading={loadingMedications}
          emptyMessage="No medication records yet"
        />
      )}

      {activeTab === "appointments" && (
        <DataTable<AppointmentRow>
          data={appointments}
          columns={appointmentColumns}
          onCellEdit={handleAppointmentCellEdit}
          onAddRow={() => setShowAddAppointment(true)}
          addRowLabel="Add Appointment"
          searchPlaceholder="Search appointments..."
          exportFilename="appointments"
          loading={loadingAppointments}
          emptyMessage="No appointments yet"
          emptyAction="Schedule your first appointment"
        />
      )}

      {/* ─── Add Patient Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        title="Add New Patient"
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowAddPatient(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={submitting} onClick={handleAddPatient}>
              Add Patient
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
          <Input
            label="Name *"
            value={patientForm.name}
            onChange={(e) => setPatientForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Patient name"
          />
          <Input
            label="Age *"
            type="number"
            value={patientForm.age}
            onChange={(e) => setPatientForm((f) => ({ ...f, age: e.target.value }))}
            placeholder="Age"
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Gender *</label>
            <select
              value={patientForm.gender}
              onChange={(e) => setPatientForm((f) => ({ ...f, gender: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Phone"
            value={patientForm.phone}
            onChange={(e) => setPatientForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Phone number"
          />
          <Input
            label="Email"
            type="email"
            value={patientForm.email}
            onChange={(e) => setPatientForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email address"
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Blood Group</label>
            <select
              value={patientForm.blood_group}
              onChange={(e) => setPatientForm((f) => ({ ...f, blood_group: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select blood group</option>
              {BLOOD_GROUP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Fitzpatrick Type</label>
            <select
              value={patientForm.fitzpatrick_type}
              onChange={(e) => setPatientForm((f) => ({ ...f, fitzpatrick_type: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select skin type</option>
              {FITZPATRICK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Chief Complaint *"
            value={patientForm.chief_complaint}
            onChange={(e) => setPatientForm((f) => ({ ...f, chief_complaint: e.target.value }))}
            placeholder="Primary complaint"
          />
          <Input
            label="City"
            value={patientForm.city}
            onChange={(e) => setPatientForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="City"
          />
          <Input
            label="State"
            value={patientForm.state}
            onChange={(e) => setPatientForm((f) => ({ ...f, state: e.target.value }))}
            placeholder="State"
          />
          <div className="col-span-2">
            <Input
              label="Known Allergies"
              value={patientForm.allergies}
              onChange={(e) => setPatientForm((f) => ({ ...f, allergies: e.target.value }))}
              placeholder="Comma-separated allergies"
            />
          </div>
          <div className="col-span-2">
            <Input
              label="Chronic Conditions"
              value={patientForm.chronic_conditions}
              onChange={(e) => setPatientForm((f) => ({ ...f, chronic_conditions: e.target.value }))}
              placeholder="Any chronic conditions"
            />
          </div>
          <div className="col-span-2">
            <Input
              label="Family History"
              value={patientForm.family_history}
              onChange={(e) => setPatientForm((f) => ({ ...f, family_history: e.target.value }))}
              placeholder="Relevant family medical history"
            />
          </div>
        </div>
      </Modal>

      {/* ─── Add Visit Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddVisit}
        onClose={() => setShowAddVisit(false)}
        title="Log Visit"
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowAddVisit(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={submitting} onClick={handleAddVisit}>
              Log Visit
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Patient *</label>
            <select
              value={visitForm.patient_id}
              onChange={(e) => setVisitForm((f) => ({ ...f, patient_id: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select patient</option>
              {patientList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Visit Date"
            type="date"
            value={visitForm.visit_date}
            onChange={(e) => setVisitForm((f) => ({ ...f, visit_date: e.target.value }))}
          />
          <Input
            label="Chief Complaint"
            value={visitForm.chief_complaint}
            onChange={(e) => setVisitForm((f) => ({ ...f, chief_complaint: e.target.value }))}
            placeholder="Chief complaint"
          />
          <Input
            label="Diagnosis"
            value={visitForm.diagnosis}
            onChange={(e) => setVisitForm((f) => ({ ...f, diagnosis: e.target.value }))}
            placeholder="Diagnosis"
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Severity</label>
            <select
              value={visitForm.severity}
              onChange={(e) => setVisitForm((f) => ({ ...f, severity: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select severity</option>
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Body Location</label>
            <select
              value={visitForm.body_location}
              onChange={(e) => setVisitForm((f) => ({ ...f, body_location: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select location</option>
              {BODY_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <Input
            label="Visit Fee"
            type="number"
            value={visitForm.visit_fee}
            onChange={(e) => setVisitForm((f) => ({ ...f, visit_fee: e.target.value }))}
            placeholder="Fee amount"
          />
          <Input
            label="Duration (minutes)"
            type="number"
            value={visitForm.duration_minutes}
            onChange={(e) => setVisitForm((f) => ({ ...f, duration_minutes: e.target.value }))}
            placeholder="Duration in minutes"
          />
          <div className="col-span-2">
            <Textarea
              label="Doctor Notes"
              value={visitForm.doctor_notes}
              onChange={(e) => setVisitForm((f) => ({ ...f, doctor_notes: e.target.value }))}
              placeholder="Notes from the visit"
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* ─── Add Treatment Plan Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={showAddTreatment}
        onClose={() => setShowAddTreatment(false)}
        title="Add Treatment Plan"
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowAddTreatment(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={submitting} onClick={handleAddTreatment}>
              Add Treatment Plan
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Patient *</label>
            <select
              value={treatmentForm.patient_id}
              onChange={(e) => setTreatmentForm((f) => ({ ...f, patient_id: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select patient</option>
              {patientList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Condition"
            value={treatmentForm.condition}
            onChange={(e) => setTreatmentForm((f) => ({ ...f, condition: e.target.value }))}
            placeholder="Condition being treated"
          />
          <div className="col-span-2">
            <Textarea
              label="Treatment Plan"
              value={treatmentForm.treatment_plan}
              onChange={(e) => setTreatmentForm((f) => ({ ...f, treatment_plan: e.target.value }))}
              placeholder="Describe the treatment plan"
              rows={3}
            />
          </div>
          <Input
            label="Next Assessment Date"
            type="date"
            value={treatmentForm.next_assessment}
            onChange={(e) => setTreatmentForm((f) => ({ ...f, next_assessment: e.target.value }))}
          />
        </div>
      </Modal>

      {/* ─── Add Appointment Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={showAddAppointment}
        onClose={() => setShowAddAppointment(false)}
        title="Schedule Appointment"
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowAddAppointment(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={submitting} onClick={handleAddAppointment}>
              Schedule Appointment
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Patient *</label>
            <select
              value={appointmentForm.patient_id}
              onChange={(e) => setAppointmentForm((f) => ({ ...f, patient_id: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select patient</option>
              {patientList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Date *"
            type="date"
            value={appointmentForm.appointment_date}
            onChange={(e) => setAppointmentForm((f) => ({ ...f, appointment_date: e.target.value }))}
          />
          <Input
            label="Time"
            type="time"
            value={appointmentForm.appointment_time}
            onChange={(e) => setAppointmentForm((f) => ({ ...f, appointment_time: e.target.value }))}
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Type</label>
            <select
              value={appointmentForm.type}
              onChange={(e) => setAppointmentForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select type</option>
              {VISIT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-text-primary mb-2">Duration</label>
            <select
              value={appointmentForm.duration_minutes}
              onChange={(e) => setAppointmentForm((f) => ({ ...f, duration_minutes: e.target.value }))}
              className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>
          <Input
            label="Reason"
            value={appointmentForm.reason}
            onChange={(e) => setAppointmentForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Reason for appointment"
          />
          <Input
            label="Visit Fee"
            type="number"
            value={appointmentForm.visit_fee}
            onChange={(e) => setAppointmentForm((f) => ({ ...f, visit_fee: e.target.value }))}
            placeholder="Fee amount"
          />
        </div>
      </Modal>
    </main>
  );
}
