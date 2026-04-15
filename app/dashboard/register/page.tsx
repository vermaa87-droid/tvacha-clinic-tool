"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { type ColumnDef } from "@tanstack/react-table";
import { EditableCell } from "@/components/ui/EditableCell";

// @tanstack/react-table is ~40 KB; lazy-load the DataTable itself so the
// Clinic Register shell and column-defs render first, then the heavy table
// hydrates. The skeleton matches the table's typical height to keep CLS at 0.
const DataTable = dynamic(
  () => import("@/components/ui/DataTable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <div
        className="bg-card rounded-xl animate-pulse"
        style={{ height: 520, border: "1px solid rgba(184,147,106,0.2)" }}
      />
    ),
  }
) as <T extends Record<string, unknown>>(
  props: React.ComponentProps<typeof import("@/components/ui/DataTable").DataTable<T>>
) => JSX.Element;
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Prescription } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";
import { useRefreshTick } from "@/lib/RefreshContext";
import Link from "next/link";
import { Pencil, Plus, Phone, Trash2, CheckSquare } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useMutationQueue } from "@/lib/mutation-queue";
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
  email: string | null;
  chief_complaint: string | null;
  current_diagnosis: string | null;
  severity: string | null;
  treatment_status: string | null;
  last_visit_date: string | null;
  next_followup_date: string | null;
  total_visits: number | null;
  city: string | null;
  total_fees: number;
  latest_diagnosis: string | null;
  blood_group: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  current_medications: string | null;
  fitzpatrick_type: number | null;
}

interface VisitRow extends Record<string, unknown> {
  id: string;
  patient_id: string;
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
  patient_id: string;
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
  patient_id: string;
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
  patient_id: string;
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
  { key: "patients", labelKey: "register_tab_patients" as const },
  { key: "visits", labelKey: "register_tab_visits" as const },
  { key: "treatments", labelKey: "register_tab_treatments" as const },
  { key: "medications", labelKey: "register_tab_medications" as const },
  { key: "appointments", labelKey: "register_tab_appointments" as const },
] as const;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type TabKey = (typeof TABS)[number]["key"];

// ─── Page Component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const refreshTick = useRefreshTick();
  const { showToast } = useToast();
  const { enqueue } = useMutationQueue();
  const pendingDeletions = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
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

  // Selection state
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Modal states
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patientFormError, setPatientFormError] = useState("");
  const [patientToDelete, setPatientToDelete] = useState<PatientRow | null>(null);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  // `submitting` is read by Button loading={} props below; the setter is
  // unused (always-false placeholder).
  // eslint-disable-next-line no-unused-vars
  const [submitting, _setSubmitting] = useState(false);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchPatients = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoadingPatients(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("linked_doctor_id", user.id)
        .neq("treatment_status", "pending_diagnosis")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        // Fetch total fees + latest diagnosis per patient
        const patientIds = data.map((p: Record<string, unknown>) => p.id as string);
        let feesMap: Record<string, number> = {};
        let diagMap: Record<string, string> = {};
        if (patientIds.length > 0) {
          const [feesRes, visitsRes] = await Promise.all([
            supabase.from("patient_fees").select("patient_id, amount").in("patient_id", patientIds),
            supabase.from("visits").select("patient_id, diagnosis").in("patient_id", patientIds).order("created_at", { ascending: false }),
          ]);
          if (feesRes.data) {
            for (const f of feesRes.data) {
              const pid = f.patient_id as string;
              feesMap[pid] = (feesMap[pid] || 0) + Number(f.amount || 0);
            }
          }
          if (visitsRes.data) {
            for (const v of visitsRes.data) {
              const pid = v.patient_id as string;
              if (!diagMap[pid] && v.diagnosis) diagMap[pid] = v.diagnosis as string;
            }
          }
        }
        const patientsEnriched = data.map((p: Record<string, unknown>) => ({
          ...p,
          total_fees: feesMap[p.id as string] || 0,
          latest_diagnosis: diagMap[p.id as string] || null,
        }));
        setPatients(patientsEnriched as unknown as PatientRow[]);
        setPatientList(data.map((p: Record<string, unknown>) => ({ id: p.id as string, name: p.name as string })));
      }
    } catch (err) {
      console.error("[register] fetch patients error:", err);
    } finally {
      setLoadingPatients(false);
    }
  }, [user]);

  const fetchVisits = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoadingVisits(true);
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

  const fetchTreatmentPlans = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoadingTreatments(true);
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

  const fetchMedications = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoadingMedications(true);
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
                patient_id: rx.patient_id,
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

  const fetchAppointments = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoadingAppointments(true);
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

  const refetchAll = useCallback((silent?: boolean) => {
    fetchPatients(silent);
    fetchVisits(silent);
    fetchTreatmentPlans(silent);
    fetchMedications(silent);
    fetchAppointments(silent);
  }, [fetchPatients, fetchVisits, fetchTreatmentPlans, fetchMedications, fetchAppointments]);

  useEffect(() => {
    if (!user) return;
    refetchAll(refreshTick > 0);
  }, [user, refetchAll, refreshTick]);


  // Realtime: sync across devices (requires Supabase Realtime enabled for these tables)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("register-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `linked_doctor_id=eq.${user.id}` }, () => { refetchAll(true); })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${user.id}` }, () => { fetchAppointments(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refetchAll, fetchAppointments]);

  // ─── Cell Edit Handlers ────────────────────────────────────────────────────

  const handlePatientCellEdit = useCallback(
    async (rowIndex: number, columnId: string, value: unknown) => {
      const row = patients[rowIndex];
      if (!row) return;
      // Array fields: convert comma-separated string back to array
      let dbValue = value;
      if (columnId === "allergies" || columnId === "chronic_conditions") {
        dbValue = typeof value === "string" && value.trim()
          ? value.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      }
      try {
        const { error } = await supabase
          .from("patients")
          .update({ [columnId]: dbValue })
          .eq("id", row.id);
        if (error) throw error;
        setPatients((prev) =>
          prev.map((p, i) => (i === rowIndex ? { ...p, [columnId]: dbValue } : p))
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
        id: "select",
        size: 40,
        header: () => {
          const allSelected = patients.length > 0 && patients.every((p) => selectedPatients.has(p.id));
          const someSelected = !allSelected && patients.some((p) => selectedPatients.has(p.id));
          return (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={() => {
                if (allSelected) {
                  setSelectedPatients(new Set());
                } else {
                  setSelectedPatients(new Set(patients.map((p) => p.id)));
                }
              }}
              className="w-4 h-4 rounded accent-[#b8936a] cursor-pointer"
            />
          );
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedPatients.has(row.original.id)}
            onChange={() => {
              setSelectedPatients((prev) => {
                const next = new Set(prev);
                next.has(row.original.id) ? next.delete(row.original.id) : next.add(row.original.id);
                return next;
              });
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded accent-[#b8936a] cursor-pointer"
          />
        ),
      },
      {
        id: "sno",
        header: "S.No",
        size: 48,
        cell: ({ row }) => row.index + 1,
      },
      { accessorKey: "patient_display_id", header: t("reg_col_patient_id") },
      {
        accessorKey: "name",
        header: t("reg_col_name"),
        cell: ({ row }) => (
          <Link
            href={`/dashboard/patients/${row.original.id}`}
            className="text-primary-500 font-medium capitalize hover:underline block max-w-[200px] truncate"
            title={row.original.name}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "age_gender",
        header: t("reg_col_age_gender"),
        cell: ({ row }) => {
          const age = row.original.age ?? "";
          const g = row.original.gender;
          const gShort = g === "Male" ? "M" : g === "Female" ? "F" : g === "Other" ? "O" : g ? g.charAt(0).toUpperCase() : "";
          return age || gShort ? `${age}/${gShort}` : "";
        },
      },
      { accessorKey: "phone", header: t("reg_col_phone") },
      { accessorKey: "chief_complaint", header: t("reg_col_chief_complaint") },
      { accessorKey: "current_diagnosis", header: "Disease Classification" },
      {
        accessorKey: "latest_diagnosis",
        header: "Diagnosis",
        cell: ({ row }) => {
          const val = row.original.latest_diagnosis;
          return <span className="text-xs" style={{ color: val ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>{val || "—"}</span>;
        },
      },
      {
        accessorKey: "severity",
        header: t("reg_col_severity"),
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
        header: t("reg_col_status"),
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
      {
        accessorKey: "last_visit_date",
        header: t("reg_col_last_visit"),
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.last_visit_date || ""}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "last_visit_date", val)}
            type="date"
            displayFormatter={(v) => formatDate(String(v))}
          />
        ),
      },
      {
        accessorKey: "next_followup_date",
        header: t("reg_col_next_followup"),
        cell: ({ row, table }) => {
          const date = row.original.next_followup_date;
          const isOverdue = !!date && new Date(date) < new Date(new Date().toISOString().split("T")[0]);
          return (
            <EditableCell
              value={date || ""}
              onSave={(val) => (table.options.meta as any).updateData(row.index, "next_followup_date", val)}
              type="date"
              displayFormatter={(v) => formatDate(String(v))}
              displayClassName={isOverdue ? "text-red-600 font-semibold" : undefined}
            />
          );
        },
      },
      { accessorKey: "total_visits", header: t("reg_col_total_visits") },
      { accessorKey: "city", header: t("reg_col_city") },
      {
        accessorKey: "total_fees",
        header: "Total Fees",
        cell: ({ row }) => {
          const fees = row.original.total_fees;
          return (
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: fees > 0 ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
              {fees > 0 ? `₹${fees.toLocaleString("en-IN")}` : "—"}
            </span>
          );
        },
      },
      { accessorKey: "blood_group", header: "Blood Group" },
      {
        accessorKey: "allergies",
        header: "Allergies",
        cell: ({ row, table }) => (
          <EditableCell
            value={Array.isArray(row.original.allergies) ? row.original.allergies.join(", ") : (row.original.allergies || "")}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "allergies", val)}
          />
        ),
      },
      {
        accessorKey: "chronic_conditions",
        header: "Chronic Conditions",
        cell: ({ row, table }) => (
          <EditableCell
            value={Array.isArray(row.original.chronic_conditions) ? row.original.chronic_conditions.join(", ") : (row.original.chronic_conditions || "")}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "chronic_conditions", val)}
          />
        ),
      },
      { accessorKey: "current_medications", header: "Current Medications" },
      {
        accessorKey: "fitzpatrick_type",
        header: "Skin Tone",
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.fitzpatrick_type ? String(row.original.fitzpatrick_type) : ""}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "fitzpatrick_type", val ? Number(val) : null)}
            type="select"
            options={FITZPATRICK_OPTIONS}
            displayFormatter={(v) => v ? `Type ${v}` : "—"}
          />
        ),
      },
      {
        id: "quick_actions",
        header: t("reg_col_quick_actions"),
        cell: ({ row }) => (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              title={t("reg_edit_patient")}
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
              title={t("reg_new_visit")}
              href={`/dashboard/patients/${row.original.id}`}
              className="p-1 rounded hover:bg-primary-100 text-text-muted hover:text-primary-500"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
            {row.original.phone && (
              <a
                title={t("reg_call_patient")}
                href={`tel:${row.original.phone}`}
                className="p-1 rounded hover:bg-primary-100 text-text-muted hover:text-primary-500"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              title="Remove patient"
              className="p-1 rounded hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors"
              onClick={() => setPatientToDelete(row.original)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [t, patients, selectedPatients]
  );

  const visitColumns = useMemo<ColumnDef<VisitRow, unknown>[]>(
    () => [
      {
        accessorKey: "visit_date",
        header: t("reg_col_date"),
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.visit_date || ""}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "visit_date", val)}
            type="date"
            displayFormatter={(v) => formatDate(String(v))}
          />
        ),
      },
      { accessorKey: "patient_name", header: t("reg_col_patient"), cell: ({ row }: { row: { original: VisitRow } }) => String(row.original.patient_name ?? "") },
      { accessorKey: "chief_complaint", header: t("reg_col_chief_complaint") },
      { accessorKey: "diagnosis", header: t("reg_col_diagnosis") },
      {
        accessorKey: "severity",
        header: t("reg_col_severity"),
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
      { accessorKey: "body_location", header: t("reg_col_body_location") },
      { accessorKey: "treatment_given", header: t("reg_col_treatment_given") },
      { accessorKey: "visit_fee", header: t("reg_col_fee") },
      { accessorKey: "duration_minutes", header: t("reg_col_duration_min") },
      { accessorKey: "doctor_notes", header: t("reg_col_notes") },
    ],
    [t]
  );

  const treatmentColumns = useMemo<ColumnDef<TreatmentPlanRow, unknown>[]>(
    () => [
      { accessorKey: "patient_name", header: t("reg_col_patient"), cell: ({ row }: { row: { original: TreatmentPlanRow } }) => String(row.original.patient_name ?? "") },
      { accessorKey: "condition", header: t("reg_col_condition") },
      {
        accessorKey: "treatment_started",
        header: t("reg_col_started"),
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.treatment_started || ""}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "treatment_started", val)}
            type="date"
            displayFormatter={(v) => formatDate(String(v))}
          />
        ),
      },
      { accessorKey: "treatment_plan", header: t("reg_col_plan") },
      {
        accessorKey: "response",
        header: t("reg_col_response"),
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.response}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "response", val)}
            type="select"
            options={TREATMENT_RESPONSE_OPTIONS}
          />
        ),
      },
      { accessorKey: "side_effects", header: t("reg_col_side_effects") },
      {
        accessorKey: "status",
        header: t("reg_col_status"),
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
        header: t("reg_col_compliance"),
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.compliance}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "compliance", val)}
            type="select"
            options={COMPLIANCE_OPTIONS}
          />
        ),
      },
      {
        accessorKey: "next_assessment",
        header: t("reg_col_next_assessment"),
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.next_assessment || ""}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "next_assessment", val)}
            type="date"
            displayFormatter={(v) => formatDate(String(v))}
          />
        ),
      },
    ],
    [t]
  );

  const medicationColumns = useMemo<ColumnDef<MedicationRow, unknown>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: t("reg_col_date"),
        cell: ({ row }: { row: { original: MedicationRow } }) => formatDate(row.original.created_at),
      },
      { accessorKey: "patient_name", header: t("reg_col_patient"), cell: ({ row }: { row: { original: MedicationRow } }) => String(row.original.patient_name ?? "") },
      { accessorKey: "medicine_name", header: t("reg_col_medicine") },
      { accessorKey: "dosage", header: t("reg_col_dosage") },
      { accessorKey: "frequency", header: t("reg_col_frequency") },
      { accessorKey: "duration", header: t("reg_col_duration") },
      { accessorKey: "diagnosis", header: t("reg_col_diagnosis") },
      { accessorKey: "status", header: t("reg_col_status") },
    ],
    [t]
  );

  const appointmentColumns = useMemo<ColumnDef<AppointmentRow, unknown>[]>(
    () => [
      {
        accessorKey: "appointment_date",
        header: t("reg_col_date"),
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.appointment_date || ""}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "appointment_date", val)}
            type="date"
            displayFormatter={(v) => formatDate(String(v))}
          />
        ),
      },
      { accessorKey: "appointment_time", header: t("reg_col_time") },
      { accessorKey: "patient_name", header: t("reg_col_patient"), cell: ({ row }: { row: { original: AppointmentRow } }) => String(row.original.patient_name ?? "") },
      {
        accessorKey: "type",
        header: t("reg_col_type"),
        cell: ({ row, table }) => (
          <EditableCell
            value={row.original.type}
            onSave={(val) => (table.options.meta as any).updateData(row.index, "type", val)}
            type="select"
            options={VISIT_TYPE_OPTIONS}
          />
        ),
      },
      { accessorKey: "duration_minutes", header: t("reg_col_duration_min") },
      { accessorKey: "reason", header: t("reg_col_reason") },
      {
        accessorKey: "status",
        header: t("reg_col_status"),
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
      { accessorKey: "visit_fee", header: t("reg_col_fee") },
    ],
    [t]
  );

  // ─── Background deletion ─────────────────────────────────────────────────

  const performBackgroundDeletion = useCallback(async (patientId: string) => {
    try {
      const doctorId = user?.id;
      if (!doctorId) return;
      await fetch("/api/delete-patient", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, doctorId }),
      });
      pendingDeletions.current.delete(patientId);
    } catch (err) {
      console.error("[register] background delete failed:", err);
    }
  }, [user]);

  // ─── Optimistic removal from ALL tabs ────────────────────────────────────

  const removeFromAllTabs = useCallback((ids: Set<string>) => {
    setPatients((prev) => prev.filter((p) => !ids.has(p.id)));
    setVisits((prev) => prev.filter((v) => !ids.has(v.patient_id)));
    setTreatmentPlans((prev) => prev.filter((t) => !ids.has(t.patient_id)));
    setMedications((prev) => prev.filter((m) => !ids.has(m.patient_id)));
    setAppointments((prev) => prev.filter((a) => !ids.has(a.patient_id)));
  }, []);

  const refetchAllTabs = useCallback(() => {
    fetchPatients(true);
    fetchVisits(true);
    fetchTreatmentPlans(true);
    fetchMedications(true);
    fetchAppointments(true);
  }, [fetchPatients, fetchVisits, fetchTreatmentPlans, fetchMedications, fetchAppointments]);

  // ─── Optimistic Single Delete ──────────────────────────────────────────────

  const handleUnlinkPatient = () => {
    if (!patientToDelete) return;
    const { id, name } = patientToDelete;
    setPatientToDelete(null);

    removeFromAllTabs(new Set([id]));

    const timeout = setTimeout(() => {
      performBackgroundDeletion(id);
    }, 5500);
    pendingDeletions.current.set(id, timeout);

    showToast({
      message: `${name} deleted`,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          const t = pendingDeletions.current.get(id);
          if (t) { clearTimeout(t); pendingDeletions.current.delete(id); }
          refetchAllTabs();
        },
      },
    });
  };

  // ─── Optimistic Bulk Delete ────────────────────────────────────────────────

  const handleBulkUnlink = () => {
    const ids = Array.from(selectedPatients);
    const count = ids.length;
    setShowBulkDeleteModal(false);

    removeFromAllTabs(new Set(ids));
    setSelectedPatients(new Set());

    const bulkTimeout = setTimeout(() => {
      for (const id of ids) {
        performBackgroundDeletion(id);
      }
    }, 5500);

    const bulkKey = `bulk-${Date.now()}`;
    pendingDeletions.current.set(bulkKey, bulkTimeout);

    showToast({
      message: `${count} patient${count > 1 ? "s" : ""} deleted`,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          const t = pendingDeletions.current.get(bulkKey);
          if (t) { clearTimeout(t); pendingDeletions.current.delete(bulkKey); }
          refetchAllTabs();
        },
      },
    });
  };

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
    if (!user) return;
    setPatientFormError("");

    // Client-side validation
    const missing: string[] = [];
    if (!patientForm.name.trim()) missing.push("Name");
    if (!patientForm.age) missing.push("Age");
    if (!patientForm.gender) missing.push("Gender");
    if (!patientForm.chief_complaint?.trim()) missing.push("Chief Complaint");
    if (missing.length > 0) {
      setPatientFormError(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    if (patientForm.phone) {
      const phoneDigits = patientForm.phone.replace(/\D/g, "");
      if (phoneDigits.length !== 10 && !(phoneDigits.length === 12 && phoneDigits.startsWith("91"))) {
        setPatientFormError("Please enter a valid 10-digit phone number.");
        return;
      }
    }

    // Capture form values before resetting
    const capturedForm = { ...patientForm };
    const displayId = `TVP-${String(patients.length + 1).padStart(4, "0")}`;
    const tempId = `temp-${Date.now()}`;

    const medicalHistory: Record<string, unknown> = {};
    if (capturedForm.chronic_conditions) medicalHistory.chronic_conditions = capturedForm.chronic_conditions;
    if (capturedForm.family_history) medicalHistory.family_history = capturedForm.family_history;

    // Build optimistic patient entry
    const optimisticPatient: PatientRow = {
      id: tempId,
      patient_display_id: displayId,
      name: capturedForm.name,
      age: parseInt(capturedForm.age),
      gender: capturedForm.gender,
      phone: capturedForm.phone || null,
      email: capturedForm.email || null,
      chief_complaint: capturedForm.chief_complaint,
      current_diagnosis: null,
      severity: null,
      treatment_status: null,
      last_visit_date: null,
      next_followup_date: null,
      total_visits: 0,
      city: capturedForm.city || null,
      total_fees: 0,
      latest_diagnosis: null,
      blood_group: capturedForm.blood_group || null,
      allergies: capturedForm.allergies ? capturedForm.allergies.split(",").map((a) => a.trim()) : null,
      chronic_conditions: capturedForm.chronic_conditions ? [capturedForm.chronic_conditions] : null,
      current_medications: null,
      fitzpatrick_type: capturedForm.fitzpatrick_type ? parseInt(capturedForm.fitzpatrick_type) : null,
    };

    // 1. Close modal immediately
    setShowAddPatient(false);
    setPatientForm({ name: "", age: "", gender: "", phone: "", email: "", blood_group: "", fitzpatrick_type: "", chief_complaint: "", city: "", state: "", allergies: "", chronic_conditions: "", family_history: "" });

    // 2. Show success toast
    showToast({ message: "Patient added" });

    // 3. Optimistic update — add to local array
    setPatients((prev) => [optimisticPatient, ...prev]);

    // 4. Enqueue background Supabase insert
    enqueue({
      label: "Add patient",
      fn: async () => {
        const { error } = await supabase.from("patients").insert({
          linked_doctor_id: user.id,
          patient_display_id: displayId,
          name: capturedForm.name,
          age: parseInt(capturedForm.age),
          gender: capturedForm.gender,
          phone: capturedForm.phone || null,
          email: capturedForm.email || null,
          blood_group: capturedForm.blood_group || null,
          fitzpatrick_type: capturedForm.fitzpatrick_type ? parseInt(capturedForm.fitzpatrick_type) : null,
          chief_complaint: capturedForm.chief_complaint,
          city: capturedForm.city || null,
          state: capturedForm.state || null,
          allergies: capturedForm.allergies ? capturedForm.allergies.split(",").map((a) => a.trim()) : null,
          medical_history: Object.keys(medicalHistory).length > 0 ? medicalHistory : {},
        });
        if (error) throw error;
        // Refetch to get real ID and server data
        fetchPatients(true);
      },
      onError: (err) => {
        console.error("[register] add patient error:", err);
        showToast({ message: "Failed to add patient. Please try again." });
        // Remove optimistic entry
        setPatients((prev) => prev.filter((p) => p.id !== tempId));
      },
    });
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

    // Capture form values before resetting
    const capturedForm = { ...visitForm };
    const tempId = `temp-${Date.now()}`;
    const matchedPatient = patients.find((p) => p.id === capturedForm.patient_id);

    // Build optimistic visit entry
    const optimisticVisit: VisitRow = {
      id: tempId,
      patient_id: capturedForm.patient_id,
      visit_date: capturedForm.visit_date,
      patient_name: matchedPatient?.name || "Unknown",
      chief_complaint: capturedForm.chief_complaint || null,
      diagnosis: capturedForm.diagnosis || null,
      severity: capturedForm.severity || null,
      body_location: capturedForm.body_location || null,
      treatment_given: null,
      visit_fee: capturedForm.visit_fee ? parseFloat(capturedForm.visit_fee) : null,
      duration_minutes: capturedForm.duration_minutes ? parseInt(capturedForm.duration_minutes) : null,
      doctor_notes: capturedForm.doctor_notes || null,
    };

    // 1. Close modal immediately
    setShowAddVisit(false);
    setVisitForm({ patient_id: "", visit_date: new Date().toISOString().split("T")[0], chief_complaint: "", diagnosis: "", severity: "", body_location: "", visit_fee: "", duration_minutes: "", doctor_notes: "" });

    // 2. Show success toast
    showToast({ message: "Visit logged" });

    // 3. Optimistic update — add to local array
    setVisits((prev) => [optimisticVisit, ...prev]);

    // Also optimistically update patient stats
    if (matchedPatient) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === capturedForm.patient_id
            ? { ...p, last_visit_date: capturedForm.visit_date, total_visits: ((p.total_visits as number) || 0) + 1 }
            : p
        )
      );
    }

    // 4. Enqueue background Supabase insert
    enqueue({
      label: "Log visit",
      fn: async () => {
        const { error } = await supabase.from("visits").insert({
          doctor_id: user.id,
          patient_id: capturedForm.patient_id,
          visit_date: capturedForm.visit_date,
          chief_complaint: capturedForm.chief_complaint || null,
          diagnosis: capturedForm.diagnosis || null,
          severity: capturedForm.severity || null,
          body_location: capturedForm.body_location || null,
          visit_fee: capturedForm.visit_fee ? parseFloat(capturedForm.visit_fee) : null,
          duration_minutes: capturedForm.duration_minutes ? parseInt(capturedForm.duration_minutes) : null,
          doctor_notes: capturedForm.doctor_notes || null,
        });
        if (error) throw error;

        // Update patient's last_visit_date and increment total_visits
        if (matchedPatient) {
          await supabase
            .from("patients")
            .update({
              last_visit_date: capturedForm.visit_date,
              total_visits: ((matchedPatient.total_visits as number) || 0) + 1,
            })
            .eq("id", capturedForm.patient_id);
        }

        // Refetch to get real IDs
        fetchVisits(true);
        fetchPatients(true);
      },
      onError: (err) => {
        console.error("[register] add visit error:", err);
        showToast({ message: "Failed to log visit. Please try again." });
        // Remove optimistic entry
        setVisits((prev) => prev.filter((v) => v.id !== tempId));
        // Revert patient stats
        if (matchedPatient) {
          setPatients((prev) =>
            prev.map((p) =>
              p.id === capturedForm.patient_id
                ? { ...p, total_visits: Math.max(((p.total_visits as number) || 1) - 1, 0) }
                : p
            )
          );
        }
      },
    });
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

    // Capture form values before resetting
    const capturedForm = { ...treatmentForm };
    const tempId = `temp-${Date.now()}`;
    const matchedPatient = patients.find((p) => p.id === capturedForm.patient_id);
    const today = new Date().toISOString().split("T")[0];

    // Build optimistic treatment entry
    const optimisticTreatment: TreatmentPlanRow = {
      id: tempId,
      patient_id: capturedForm.patient_id,
      patient_name: matchedPatient?.name || "Unknown",
      condition: capturedForm.condition || null,
      treatment_started: today,
      treatment_plan: capturedForm.treatment_plan || null,
      response: null,
      side_effects: null,
      status: "ongoing",
      compliance: null,
      next_assessment: capturedForm.next_assessment || null,
    };

    // 1. Close modal immediately
    setShowAddTreatment(false);
    setTreatmentForm({ patient_id: "", condition: "", treatment_plan: "", next_assessment: "" });

    // 2. Show success toast
    showToast({ message: "Treatment plan added" });

    // 3. Optimistic update — add to local array
    setTreatmentPlans((prev) => [optimisticTreatment, ...prev]);

    // 4. Enqueue background Supabase insert
    enqueue({
      label: "Add treatment plan",
      fn: async () => {
        const { error } = await supabase.from("treatment_plans").insert({
          doctor_id: user.id,
          patient_id: capturedForm.patient_id,
          condition: capturedForm.condition || null,
          treatment_plan: capturedForm.treatment_plan || null,
          treatment_started: today,
          next_assessment: capturedForm.next_assessment || null,
          status: "ongoing",
        });
        if (error) throw error;
        // Refetch to get real ID
        fetchTreatmentPlans(true);
      },
      onError: (err) => {
        console.error("[register] add treatment plan error:", err);
        showToast({ message: "Failed to add treatment plan. Please try again." });
        // Remove optimistic entry
        setTreatmentPlans((prev) => prev.filter((t) => t.id !== tempId));
      },
    });
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

    // Capture form values before resetting
    const capturedForm = { ...appointmentForm };
    const tempId = `temp-${Date.now()}`;
    const matchedPatient = patients.find((p) => p.id === capturedForm.patient_id);

    // Build optimistic appointment entry
    const optimisticAppointment: AppointmentRow = {
      id: tempId,
      patient_id: capturedForm.patient_id,
      appointment_date: capturedForm.appointment_date,
      appointment_time: capturedForm.appointment_time || "",
      patient_name: matchedPatient?.name || "Unknown",
      type: capturedForm.type || null,
      duration_minutes: parseInt(capturedForm.duration_minutes),
      reason: capturedForm.reason || null,
      status: "scheduled",
      visit_fee: capturedForm.visit_fee ? parseFloat(capturedForm.visit_fee) : null,
    };

    // 1. Close modal immediately
    setShowAddAppointment(false);
    setAppointmentForm({ patient_id: "", appointment_date: "", appointment_time: "", type: "", duration_minutes: "30", reason: "", visit_fee: "" });

    // 2. Show success toast
    showToast({ message: "Appointment scheduled" });

    // 3. Optimistic update — add to local array
    setAppointments((prev) => [optimisticAppointment, ...prev]);

    // 4. Enqueue background Supabase insert
    enqueue({
      label: "Schedule appointment",
      fn: async () => {
        const { error } = await supabase.from("appointments").insert({
          doctor_id: user.id,
          patient_id: capturedForm.patient_id,
          appointment_date: capturedForm.appointment_date,
          appointment_time: capturedForm.appointment_time || null,
          type: capturedForm.type || null,
          duration_minutes: parseInt(capturedForm.duration_minutes),
          reason: capturedForm.reason || null,
          visit_fee: capturedForm.visit_fee ? parseFloat(capturedForm.visit_fee) : null,
          status: "scheduled",
        });
        if (error) throw error;
        // Refetch to get real ID
        fetchAppointments(true);
      },
      onError: (err) => {
        console.error("[register] add appointment error:", err);
        showToast({ message: "Failed to schedule appointment. Please try again." });
        // Remove optimistic entry
        setAppointments((prev) => prev.filter((a) => a.id !== tempId));
      },
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-text-primary">{t("register_title")}</h1>
        <p className="text-text-muted mt-1">{t("register_subtitle")}</p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-primary-200 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
        <nav className="flex flex-nowrap gap-0 -mb-px" style={{ minWidth: "max-content" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 sm:px-5 py-3 text-sm transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.key
                  ? "border-b-[3px] border-[#b8936a] text-[#b8936a] font-semibold"
                  : "text-text-muted hover:text-[#b8936a] font-medium"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "patients" && (
        <div>
          {/* Desktop table */}
          <div className="hidden md:block">
            {selectedPatients.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 mb-2 rounded-lg bg-red-50 border border-red-200">
                <CheckSquare className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-700">
                  {selectedPatients.size} patient{selectedPatients.size > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove selected
                </button>
                <button
                  onClick={() => setSelectedPatients(new Set())}
                  className="text-sm text-red-400 hover:text-red-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
            <DataTable<PatientRow>
              data={patients}
              columns={patientColumns}
              onCellEdit={handlePatientCellEdit}
              onAddRow={() => setShowAddPatient(true)}
              addRowLabel={t("reg_add_patient")}
              searchPlaceholder={t("reg_search_patients")}
              exportFilename="patient-register"
              loading={loadingPatients}
              emptyMessage={t("reg_empty_patients")}
              emptyAction={t("reg_empty_patients_action")}
              pageSize={patientPageSize}
            />
            <div className="hidden md:flex items-center gap-2 mt-2 text-sm text-text-muted">
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

          {/* Mobile card view */}
          <div className="md:hidden">
            {/* Mobile add button */}
            <button
              onClick={() => setShowAddPatient(true)}
              className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary-200 bg-card px-4 py-3 text-sm font-medium text-[#b8936a] hover:bg-primary-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("reg_add_patient")}
            </button>

            {loadingPatients ? (
              <div className="flex items-center justify-center py-12 text-sm text-text-muted">Loading patients...</div>
            ) : patients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-text-muted">
                <p>{t("reg_empty_patients")}</p>
                <p className="mt-1 text-xs">{t("reg_empty_patients_action")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {patients.map((patient) => {
                  const age = patient.age ?? "";
                  const g = patient.gender;
                  const gShort = g === "Male" ? "M" : g === "Female" ? "F" : g === "Other" ? "O" : g ? g.charAt(0).toUpperCase() : "";
                  const ageGender = age || gShort ? `${age}/${gShort}` : "—";

                  const severityLabel = SEVERITY_OPTIONS.find((o) => o.value === patient.severity)?.label ?? patient.severity;
                  const severityColor = patient.severity ? SEVERITY_COLORS[patient.severity] ?? "bg-stone-100 text-stone-600" : null;

                  const statusLabel = TREATMENT_STATUS_OPTIONS.find((o) => o.value === patient.treatment_status)?.label ?? patient.treatment_status;
                  const statusColor = patient.treatment_status ? TREATMENT_STATUS_COLORS[patient.treatment_status] ?? "bg-stone-100 text-stone-600" : null;

                  return (
                    <Link
                      key={patient.id}
                      href={`/dashboard/patients/${patient.id}`}
                      className="block rounded-xl border border-primary-200 border-l-[3px] border-l-[#b8936a] bg-card p-4 active:bg-primary-200 transition-colors"
                    >
                      {/* Name row */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <h3 className="font-serif text-base font-semibold text-text-primary capitalize leading-tight">
                          {patient.name}
                        </h3>
                        <span className="shrink-0 text-xs text-text-secondary">{patient.patient_display_id}</span>
                      </div>

                      {/* Fields grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        <div>
                          <span className="text-text-secondary text-xs">Age/Gender</span>
                          <p className="text-text-primary text-sm">{ageGender}</p>
                        </div>
                        <div>
                          <span className="text-text-secondary text-xs">Disease</span>
                          <p className="text-text-primary text-sm truncate">{patient.current_diagnosis || "—"}</p>
                        </div>
                        <div>
                          <span className="text-text-secondary text-xs">Last Visit</span>
                          <p className="text-text-primary text-sm">{formatDate(patient.last_visit_date) || "—"}</p>
                        </div>
                        {patient.phone && (
                          <div>
                            <span className="text-text-secondary text-xs">Phone</span>
                            <p className="text-text-primary text-sm">{patient.phone}</p>
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      {(severityColor || statusColor) && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {severityColor && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColor}`}>
                              {severityLabel}
                            </span>
                          )}
                          {statusColor && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "visits" && (
        <div className="overflow-x-auto">
          <DataTable<VisitRow>
            data={visits}
            columns={visitColumns}
            onCellEdit={handleVisitCellEdit}
            onAddRow={() => setShowAddVisit(true)}
            addRowLabel={t("reg_add_visit")}
            searchPlaceholder={t("reg_search_visits")}
            exportFilename="visit-log"
            loading={loadingVisits}
            emptyMessage={t("reg_empty_visits")}
            emptyAction={t("reg_empty_visits_action")}
          />
        </div>
      )}

      {activeTab === "treatments" && (
        <div className="overflow-x-auto">
          <DataTable<TreatmentPlanRow>
            data={treatmentPlans}
            columns={treatmentColumns}
            onCellEdit={handleTreatmentCellEdit}
            onAddRow={() => setShowAddTreatment(true)}
            addRowLabel={t("reg_add_treatment")}
            searchPlaceholder={t("reg_search_treatments")}
            exportFilename="treatment-tracker"
            loading={loadingTreatments}
            emptyMessage={t("reg_empty_treatments")}
            emptyAction={t("reg_empty_treatments_action")}
          />
        </div>
      )}

      {activeTab === "medications" && (
        <div className="overflow-x-auto">
          <DataTable<MedicationRow>
            data={medications}
            columns={medicationColumns}
            searchPlaceholder={t("reg_search_medications")}
            exportFilename="medication-log"
            loading={loadingMedications}
            emptyMessage={t("reg_empty_medications")}
          />
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="overflow-x-auto">
          <DataTable<AppointmentRow>
            data={appointments}
            columns={appointmentColumns}
            onCellEdit={handleAppointmentCellEdit}
            onAddRow={() => setShowAddAppointment(true)}
            addRowLabel={t("reg_add_appointment")}
            searchPlaceholder={t("reg_search_appointments")}
            exportFilename="appointments"
            loading={loadingAppointments}
            emptyMessage={t("reg_empty_appointments")}
            emptyAction={t("reg_empty_appointments_action")}
          />
        </div>
      )}

      {/* ─── Remove Patient Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        title="Remove Patient"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPatientToDelete(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleUnlinkPatient}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-text-secondary">
          Remove <span className="font-semibold text-text-primary">{patientToDelete?.name}</span>? This will unlink them from your clinic.
        </p>
      </Modal>

      {/* ─── Bulk Remove Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Remove Patients"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBulkDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleBulkUnlink}
            >
              Remove {selectedPatients.size} patient{selectedPatients.size > 1 ? "s" : ""}
            </Button>
          </>
        }
      >
        <p className="text-text-secondary">
          Remove <span className="font-semibold text-text-primary">{selectedPatients.size} patient{selectedPatients.size > 1 ? "s" : ""}</span> from your clinic? This will unlink them from your account.
        </p>
      </Modal>

      {/* ─── Add Patient Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        title={t("reg_modal_add_patient")}
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
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {patientFormError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {patientFormError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            type="tel"
            maxLength={15}
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
          <div className="sm:col-span-2">
            <Input
              label="Known Allergies"
              value={patientForm.allergies}
              onChange={(e) => setPatientForm((f) => ({ ...f, allergies: e.target.value }))}
              placeholder="Comma-separated allergies"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Chronic Conditions"
              value={patientForm.chronic_conditions}
              onChange={(e) => setPatientForm((f) => ({ ...f, chronic_conditions: e.target.value }))}
              placeholder="Any chronic conditions"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Family History"
              value={patientForm.family_history}
              onChange={(e) => setPatientForm((f) => ({ ...f, family_history: e.target.value }))}
              placeholder="Relevant family medical history"
            />
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
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
          <div className="sm:col-span-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
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
          <div className="sm:col-span-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
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
