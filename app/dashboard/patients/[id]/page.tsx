"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { PatientPhotosTab } from "@/components/PatientPhotosTab";
import { PatientPackagesTab } from "@/components/dashboard/PatientPackagesTab";
import { PatientProgressPhotosTab } from "@/components/dashboard/PatientProgressPhotosTab";
import { PatientBodyMapTab } from "@/components/dashboard/PatientBodyMapTab";
import { PatientInvoicesTab } from "@/components/dashboard/PatientInvoicesTab";
import { FeedbackLinkButton } from "@/components/dashboard/FeedbackLinkButton";
import type { Patient, Prescription, Medicine } from "@/lib/types";
import {
  SEVERITY_OPTIONS,
  SEVERITY_COLORS,
  TREATMENT_STATUS_OPTIONS,
  TREATMENT_STATUS_COLORS,
  BODY_LOCATIONS,
  FREQUENCY_OPTIONS,
} from "@/lib/constants";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Plus,
  Calendar,
  FileText,
  Camera,
  Activity,
  Clipboard,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Droplets,
  X,
  DollarSign,
  FlaskConical,
  Heart,
  Thermometer,
  Weight,
  Copy,
  Upload,
  Trash2,
  Pencil,
  Package as PackageIcon,
  Sparkles,
  Map as MapIcon,
  Receipt,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useRefreshTick } from "@/lib/RefreshContext";
import { useToast } from "@/components/ui/Toast";
import { useMutationQueue } from "@/lib/mutation-queue";
import { useFormValidation, isFilled } from "@/lib/use-form-validation";
import { FormErrorSummary } from "@/components/ui/FieldError";

// ─── Common diagnoses for autocomplete ──────────────────────────────────────

const COMMON_DIAGNOSES = [
  "Viral Fever",
  "Upper Respiratory Infection",
  "UTI",
  "Type 2 Diabetes",
  "Hypertension",
  "Gastritis",
  "Allergic Reaction",
  "Diarrhea",
  "Joint Pain",
  "Migraine",
  "Tinea Corporis",
  "Eczema",
  "Acne Vulgaris",
  "Psoriasis",
  "Contact Dermatitis",
];

const QUICK_COMPLAINTS = [
  "Fever",
  "Cough",
  "Headache",
  "Skin Rash",
  "Stomach Pain",
  "Body Ache",
  "Breathing",
  "Fatigue",
];

// ─── Extended Patient type ──────────────────────────────────────────────────

interface LabReport {
  title: string;
  date: string;
  notes: string;
  file_url: string;
  file_type: string;
  storage_path: string;
  uploaded_at: string;
}

interface PatientWithDetails extends Patient {
  patient_display_id: string | null;
  chief_complaint: string | null;
  current_diagnosis: string | null;
  treatment_status: string | null;
  severity: string | null;
  total_visits: number | null;
  last_visit_date: string | null;
  next_followup_date: string | null;
  blood_group: string | null;
  chronic_conditions: string[] | null;
  family_history: string | null;
  medical_history: Record<string, unknown>;
}

interface Visit {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_date: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  severity: string | null;
  body_location: string | null;
  treatment_given: string | null;
  examination_notes: string | null;
  vitals: Record<string, unknown> | null;
  visit_fee: number | null;
  fee_paid: boolean | null;
  duration_minutes: number | null;
  doctor_notes: string | null;
  follow_up_date: string | null;
  lab_tests: string | null;
  created_at: string;
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

type TabKey =
  | "overview"
  | "visits"
  | "prescriptions"
  | "photos"
  | "progress"
  | "body_map"
  | "lab_reports"
  | "packages"
  | "invoices"
  | "billing";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Activity size={16} /> },
  { key: "visits", label: "Visits", icon: <Clipboard size={16} /> },
  { key: "prescriptions", label: "Prescriptions", icon: <FileText size={16} /> },
  { key: "photos", label: "Affected Area Photos", icon: <Camera size={16} /> },
  { key: "progress", label: "Progress Photos", icon: <Sparkles size={16} /> },
  { key: "body_map", label: "Body Map", icon: <MapIcon size={16} /> },
  { key: "lab_reports", label: "Lab Reports", icon: <FlaskConical size={16} /> },
  { key: "packages", label: "Packages", icon: <PackageIcon size={16} /> },
  { key: "invoices", label: "Invoices", icon: <Receipt size={16} /> },
  { key: "billing", label: "Billing", icon: <DollarSign size={16} /> },
];

// ─── Initial form states ────────────────────────────────────────────────────

interface MedicineRow {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const INITIAL_VISIT_FORM = {
  visit_date: new Date().toISOString().split("T")[0],
  bp: "",
  temperature: "",
  weight: "",
  pulse: "",
  spo2: "",
  chief_complaint: "",
  examination_notes: "",
  diagnosis: "",
  severity: "",
  body_location: "",
  treatment_given: "",
  lab_tests: "",
  follow_up_date: "",
  visit_fee: "",
  fee_paid: false,
  doctor_notes: "",
};

const selectClass =
  "w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors";

// ─── Component ──────────────────────────────────────────────────────────────

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuthStore();
  const router = useRouter();
  const refreshTick = useRefreshTick();
  const { showToast } = useToast();
  const { enqueue } = useMutationQueue();

  // Patient data
  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // AI case data
  const [aiCase, setAiCase] = useState<{
    id: string;
    ai_diagnosis: string;
    ai_diagnosis_display: string;
    ai_confidence: number;
    ai_severity_label: string;
    ai_top_3: { class: string; confidence: number }[];
    status: string;
    doctor_override_diagnosis: string | null;
    doctor_reviewed_at: string | null;
  } | null>(null);

  // Visit data & modal
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState(INITIAL_VISIT_FORM);
  const [visitMedicines, setVisitMedicines] = useState<MedicineRow[]>([]);
  // `visitSubmitting` is read by Button loading={} below; setter is an
  // always-false placeholder.
  // eslint-disable-next-line no-unused-vars
  const [visitSubmitting, _setVisitSubmitting] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  // Diagnosis autocomplete
  const [diagnosisFocused, setDiagnosisFocused] = useState(false);

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState<
    string | null
  >(null);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  // `scheduleSubmitting` is read by Button loading={} below; setter is an
  // always-false placeholder.
  // eslint-disable-next-line no-unused-vars
  const [scheduleSubmitting, _setScheduleSubmitting] = useState(false);

  // Lab reports
  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState({ title: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [labFile, setLabFile] = useState<File | null>(null);
  const [labUploading, setLabUploading] = useState(false);
  const [labError, setLabError] = useState("");
  const visitFormValidation = useFormValidation();
  const labFormValidation = useFormValidation();
  const followUpValidation = useFormValidation();
  const visitFieldLabels = { visit_date: "Visit Date", chief_complaint: "Chief Complaint" };
  const labFieldLabels = { labFile: "Report File" };
  const followUpFieldLabels = { scheduleDate: "Follow-up Date" };

  // Medical records uploaded during patient registration (from photos table)
  const [wizardRecords, setWizardRecords] = useState<{ id: string; photo_url: string; notes: string | null; created_at: string }[]>([]);
  const [viewingRecord, setViewingRecord] = useState<{ photo_url: string; notes: string | null } | null>(null);

  // Patient fees
  const [patientFees, setPatientFees] = useState<{ id: string; amount: number; status: string; fee_type: string; created_at: string; visit_id: string | null }[]>([]);

  // ─── Fetch patient ───────────────────────────────────────────────────────

  const fetchPatient = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", params.id)
        .eq("linked_doctor_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setPatient(data as PatientWithDetails);

      // Fetch AI case
      const { data: caseData } = await supabase
        .from("cases")
        .select("id, ai_diagnosis, ai_diagnosis_display, ai_confidence, ai_severity_label, ai_top_3, status, doctor_override_diagnosis, doctor_reviewed_at")
        .eq("patient_id", params.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (caseData) {
        setAiCase({
          ...caseData,
          ai_top_3: (caseData.ai_top_3 as { class: string; confidence: number }[]) ?? [],
        });
      }
    } catch (err) {
      console.error("[patient-detail] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, params.id]);

  // ─── Fetch visits ────────────────────────────────────────────────────────

  const fetchVisits = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setVisitsLoading(true);
    try {
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .eq("patient_id", params.id)
        .eq("doctor_id", user.id)
        .order("visit_date", { ascending: false });

      if (error) throw error;
      if (data) setVisits(data as Visit[]);
    } catch (err) {
      console.error("[patient-detail] visits fetch error:", err);
    } finally {
      setVisitsLoading(false);
    }
  }, [user, params.id]);

  // ─── Fetch prescriptions ────────────────────────────────────────────────

  const fetchPrescriptions = useCallback(async (silent?: boolean) => {
    if (!user) return;
    if (!silent) setPrescriptionsLoading(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_id", params.id)
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setPrescriptions(data as Prescription[]);
    } catch (err) {
      console.error("[patient-detail] prescriptions fetch error:", err);
    } finally {
      setPrescriptionsLoading(false);
    }
  }, [user, params.id]);

  // ─── Fetch wizard medical records (uploaded during registration) ──────────

  useEffect(() => {
    if (!user) return;
    supabase
      .from("photos")
      .select("id, photo_url, notes, created_at")
      .eq("patient_id", params.id)
      .eq("photo_type", "medical_record")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setWizardRecords(data); });
  }, [user, params.id]);

  const fetchFees = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("patient_fees")
      .select("id, amount, status, fee_type, created_at, visit_id")
      .eq("patient_id", params.id)
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setPatientFees(data as typeof patientFees);
  }, [user, params.id]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  const totalFees = patientFees.reduce((sum, f) => sum + Number(f.amount), 0);
  const updateFeeStatus = async (feeId: string, newStatus: string) => {
    await supabase.from("patient_fees").update({ status: newStatus }).eq("id", feeId);
    setPatientFees((prev) => prev.map((f) => f.id === feeId ? { ...f, status: newStatus } : f));
  };

  const updateFeeAmount = async (feeId: string, newAmount: number) => {
    await supabase.from("patient_fees").update({ amount: newAmount }).eq("id", feeId);
    setPatientFees((prev) => prev.map((f) => f.id === feeId ? { ...f, amount: newAmount } : f));
  };

  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [newFeeStatus, setNewFeeStatus] = useState<string>("unpaid");
  const [addingFee, setAddingFee] = useState(false);

  const handleAddFee = async () => {
    if (!user || !patient) return;
    const amt = parseFloat(newFeeAmount);
    if (!amt || amt <= 0) return;
    setAddingFee(true);
    await supabase.from("patient_fees").insert({
      patient_id: params.id,
      doctor_id: user.id,
      amount: amt,
      status: newFeeStatus,
      fee_type: "consultation",
    });
    setNewFeeAmount("");
    setNewFeeStatus("unpaid");
    setShowAddFeeModal(false);
    setAddingFee(false);
    fetchFees();
  };

  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editingFeeValue, setEditingFeeValue] = useState("");

  // ─── Effects ─────────────────────────────────────────────────────────────

  const fetchAllData = useCallback((silent?: boolean) => {
    fetchPatient(silent);
    fetchVisits(silent);
    fetchPrescriptions(silent);
  }, [fetchPatient, fetchVisits, fetchPrescriptions]);

  useEffect(() => {
    if (!user) return;
    fetchAllData(refreshTick > 0);
  }, [user, fetchAllData, refreshTick]);


  // Realtime: sync visits across devices (requires Supabase Realtime enabled for visits table)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`patient-${params.id}-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter: `patient_id=eq.${params.id}` }, () => { fetchAllData(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, params.id, fetchAllData]);

  // ─── Visit form helpers ──────────────────────────────────────────────────

  const handleVisitChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setVisitForm((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setVisitForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const appendComplaint = (chip: string) => {
    setVisitForm((prev) => ({
      ...prev,
      chief_complaint: prev.chief_complaint
        ? `${prev.chief_complaint}, ${chip}`
        : chip,
    }));
  };

  const addMedicineRow = () => {
    setVisitMedicines((prev) => [
      ...prev,
      { name: "", dosage: "", frequency: "", duration: "" },
    ]);
  };

  const updateMedicine = (
    idx: number,
    field: keyof MedicineRow,
    value: string
  ) => {
    setVisitMedicines((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  };

  const removeMedicine = (idx: number) => {
    setVisitMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Filtered diagnosis suggestions
  const diagnosisSuggestions = useMemo(() => {
    if (!visitForm.diagnosis || !diagnosisFocused) return [];
    const q = visitForm.diagnosis.toLowerCase();
    return COMMON_DIAGNOSES.filter((d) => d.toLowerCase().includes(q)).slice(
      0,
      6
    );
  }, [visitForm.diagnosis, diagnosisFocused]);

  // ─── Visit submit ───────────────────────────────────────────────────────

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patient) return;

    const ok = visitFormValidation.validateAll([
      { field: "visit_date", message: "Please select the visit date", valid: isFilled(visitForm.visit_date) },
      { field: "chief_complaint", message: "Please enter the chief complaint", valid: isFilled(visitForm.chief_complaint) },
    ]);
    if (!ok) return;

    // Build vitals object
    const vitals: Record<string, unknown> = {};
    if (visitForm.bp) vitals.bp = visitForm.bp;
    if (visitForm.temperature)
      vitals.temperature = parseFloat(visitForm.temperature);
    if (visitForm.weight) vitals.weight = parseFloat(visitForm.weight);
    if (visitForm.pulse) vitals.pulse = parseInt(visitForm.pulse, 10);
    if (visitForm.spo2) vitals.spo2 = parseInt(visitForm.spo2, 10);

    // Capture form values before resetting
    const capturedForm = { ...visitForm };
    const capturedMedicines = [...visitMedicines];

    // Build optimistic visit entry
    const tempId = `temp-${Date.now()}`;
    const optimisticVisit: Visit = {
      id: tempId,
      patient_id: patient.id,
      doctor_id: user.id,
      visit_date: capturedForm.visit_date,
      chief_complaint: capturedForm.chief_complaint || null,
      diagnosis: capturedForm.diagnosis || null,
      severity: capturedForm.severity || null,
      body_location: capturedForm.body_location || null,
      treatment_given: capturedForm.treatment_given || null,
      examination_notes: capturedForm.examination_notes || null,
      vitals: Object.keys(vitals).length > 0 ? vitals : null,
      visit_fee: capturedForm.visit_fee ? parseFloat(capturedForm.visit_fee) : null,
      fee_paid: capturedForm.fee_paid,
      duration_minutes: null,
      doctor_notes: capturedForm.doctor_notes || null,
      follow_up_date: capturedForm.follow_up_date || null,
      lab_tests: capturedForm.lab_tests || null,
      created_at: new Date().toISOString(),
    };

    // 1. Close modal immediately
    setShowVisitModal(false);
    setVisitForm(INITIAL_VISIT_FORM);
    setVisitMedicines([]);

    // 2. Show success toast
    showToast({ message: "Visit logged" });

    // 3. Optimistic update — add visit to local array
    setVisits((prev) => [optimisticVisit, ...prev]);

    // Also optimistically update patient stats
    setPatient((prev) =>
      prev
        ? {
            ...prev,
            last_visit_date: capturedForm.visit_date,
            total_visits: (prev.total_visits || 0) + 1,
            ...(capturedForm.follow_up_date ? { next_followup_date: capturedForm.follow_up_date } : {}),
          }
        : prev
    );

    // 4. Enqueue background Supabase insert
    enqueue({
      label: "Log visit",
      fn: async () => {
        const { error } = await supabase.from("visits").insert({
          patient_id: patient.id,
          doctor_id: user.id,
          visit_date: capturedForm.visit_date,
          chief_complaint: capturedForm.chief_complaint || null,
          examination_notes: capturedForm.examination_notes || null,
          diagnosis: capturedForm.diagnosis || null,
          severity: capturedForm.severity || null,
          body_location: capturedForm.body_location || null,
          treatment_given: capturedForm.treatment_given || null,
          vitals: Object.keys(vitals).length > 0 ? vitals : null,
          visit_fee: capturedForm.visit_fee ? parseFloat(capturedForm.visit_fee) : null,
          fee_paid: capturedForm.fee_paid,
          duration_minutes: null,
          doctor_notes: capturedForm.doctor_notes || null,
          follow_up_date: capturedForm.follow_up_date || null,
          lab_tests: capturedForm.lab_tests || null,
        });
        if (error) throw error;

        // Update patient last_visit_date and total_visits
        const patientUpdate: Record<string, unknown> = {
          last_visit_date: capturedForm.visit_date,
          total_visits: (patient.total_visits || 0) + 1,
        };
        if (capturedForm.follow_up_date) {
          patientUpdate.next_followup_date = capturedForm.follow_up_date;
        }
        await supabase.from("patients").update(patientUpdate).eq("id", patient.id);

        // Create prescription if medicines were added
        if (capturedMedicines.length > 0 && capturedMedicines.some((m) => m.name)) {
          const validMedicines = capturedMedicines.filter((m) => m.name.trim());
          if (validMedicines.length > 0) {
            await supabase.from("prescriptions").insert({
              doctor_id: user.id,
              patient_id: patient.id,
              diagnosis: capturedForm.diagnosis || "General",
              medicines: validMedicines,
              follow_up_date: capturedForm.follow_up_date || null,
              status: "active",
            });
          }
        }

        // Refetch to get real IDs
        await Promise.all([fetchVisits(true), fetchPatient(true), fetchPrescriptions(true)]);
      },
      onError: (err) => {
        console.error("[patient-detail] visit insert error:", err);
        showToast({ message: "Failed to log visit. Please try again." });
        // Remove optimistic entry
        setVisits((prev) => prev.filter((v) => v.id !== tempId));
        // Revert patient stats
        setPatient((prev) =>
          prev
            ? {
                ...prev,
                total_visits: Math.max((prev.total_visits || 1) - 1, 0),
              }
            : prev
        );
      },
    });
  };

  // ─── Schedule follow-up ─────────────────────────────────────────────────

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patient) return;

    const ok = followUpValidation.validateAll([
      { field: "scheduleDate", message: "Please select a follow-up date", valid: isFilled(scheduleDate) },
    ]);
    if (!ok) return;

    // Capture values before resetting
    const capturedDate = scheduleDate;
    const capturedTime = scheduleTime || "10:00";

    // 1. Close modal immediately
    setScheduleDate("");
    setScheduleTime("");
    setShowScheduleModal(false);

    // 2. Show success toast
    showToast({ message: "Follow-up scheduled" });

    // 3. Optimistic update — update patient's next follow-up
    setPatient((prev) =>
      prev ? { ...prev, next_followup_date: capturedDate } : prev
    );

    // 4. Enqueue background Supabase insert
    enqueue({
      label: "Schedule follow-up",
      fn: async () => {
        await supabase.from("appointments").insert({
          patient_id: patient.id,
          doctor_id: user.id,
          appointment_date: capturedDate,
          appointment_time: capturedTime,
          type: "in_person",
          duration_minutes: 30,
          status: "scheduled",
          notes: "Follow-up appointment",
        });

        await supabase
          .from("patients")
          .update({ next_followup_date: capturedDate })
          .eq("id", patient.id);

        await fetchPatient(true);
      },
      onError: (err) => {
        console.error("[patient-detail] schedule error:", err);
        showToast({ message: "Failed to schedule follow-up. Please try again." });
        // Revert optimistic update
        setPatient((prev) =>
          prev ? { ...prev, next_followup_date: null } : prev
        );
      },
    });
  };

  // ─── Delete / Unlink Patient ────────────────────────────────────────────

  const handleUnlinkPatient = () => {
    if (!patient || !user) return;
    const patientId = patient.id;
    const patientName = patient.name;

    // Navigate immediately — optimistic
    router.push("/dashboard/patients");

    // Schedule background deletion with undo
    const timeout = setTimeout(() => {
      fetch("/api/delete-patient", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, doctorId: user.id }),
      }).catch((err) => console.error("[patient-detail] delete error:", err));
    }, 5500);

    showToast({
      message: `${patientName} deleted`,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timeout);
          router.push(`/dashboard/patients/${patientId}`);
        },
      },
    });
  };

  // ─── Lab Reports ────────────────────────────────────────────────────────

  const labReports: LabReport[] = (patient?.medical_history?.lab_reports as LabReport[] | undefined) ?? [];

  const handleLabUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patient) return;

    const ok = labFormValidation.validateAll([
      { field: "labFile", message: "Please choose a file to upload", valid: !!labFile },
    ]);
    if (!ok || !labFile) return;

    setLabError("");
    setLabUploading(true);
    try {
      const timestamp = Date.now();
      const safeName = labFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${patient.id}/${timestamp}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("lab-reports")
        .upload(path, labFile, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("lab-reports").getPublicUrl(path);
      const fileUrl = urlData.publicUrl;

      const newReport: LabReport = {
        title: labForm.title || labFile.name,
        date: labForm.date,
        notes: labForm.notes,
        file_url: fileUrl,
        file_type: labFile.type,
        storage_path: path,
        uploaded_at: new Date().toISOString(),
      };

      const updatedReports = [...labReports, newReport];
      const existingHistory = (patient.medical_history as Record<string, unknown>) ?? {};
      await supabase
        .from("patients")
        .update({ medical_history: { ...existingHistory, lab_reports: updatedReports } })
        .eq("id", patient.id);

      setLabForm({ title: "", date: new Date().toISOString().split("T")[0], notes: "" });
      setLabFile(null);
      setShowLabModal(false);
      await fetchPatient(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Bucket not found") || msg.includes("not found")) {
        setLabError('Storage bucket "lab-reports" not found. Create it in Supabase: Storage → New bucket → name "lab-reports" → enable Public.');
      } else if (msg.includes("aborted") || msg.includes("security policy") || msg.includes("violates")) {
        setLabError('Upload blocked by storage permissions. Run the storage policies in your Supabase SQL Editor to allow uploads.');
      } else {
        setLabError(msg || "Upload failed");
      }
    } finally {
      setLabUploading(false);
    }
  };

  const handleLabDownload = async (report: LabReport) => {
    const { data, error } = await supabase.storage
      .from("lab-reports")
      .download(report.storage_path);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = report.title || "lab-report";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLabDelete = async (index: number) => {
    if (!patient) return;
    const updated = labReports.filter((_, i) => i !== index);
    const existingHistory = (patient.medical_history as Record<string, unknown>) ?? {};
    await supabase
      .from("patients")
      .update({ medical_history: { ...existingHistory, lab_reports: updated } })
      .eq("id", patient.id);
    await fetchPatient(true);
  };

  // ─── Duplicate prescription ─────────────────────────────────────────────

  const duplicatePrescription = async (rx: Prescription) => {
    if (!user || !patient) return;
    try {
      await supabase.from("prescriptions").insert({
        doctor_id: user.id,
        patient_id: patient.id,
        diagnosis: rx.diagnosis,
        medicines: rx.medicines,
        special_instructions: rx.special_instructions,
        follow_up_date: null,
        status: "active",
      });
      await fetchPrescriptions();
    } catch (err) {
      console.error("[patient-detail] duplicate prescription error:", err);
    }
  };

  // ─── Derived data ───────────────────────────────────────────────────────

  const mostRecentVisit = visits[0] || null;
  const activePrescription = prescriptions.find((p) => p.status === "active");

  const nextFollowup = patient?.next_followup_date;
  const isOverdue =
    nextFollowup && new Date(nextFollowup) < new Date() ? true : false;

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "N/A";
    try {
      return format(new Date(d), "dd MMM yyyy");
    } catch {
      return "N/A";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex h-full">
        <div className="animate-pulse space-y-4 w-full p-8">
          <div className="h-8 bg-primary-200 rounded w-1/4" />
          <div className="h-12 bg-primary-200 rounded w-1/2" />
          <div className="h-64 bg-primary-200 rounded-lg" />
        </div>
      </main>
    );
  }

  if (!patient) {
    return (
      <main className="p-8">
        <Link
          href="/dashboard/patients"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Patients
        </Link>
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg">Patient not found</p>
        </div>
      </main>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="flex flex-col md:flex-row md:h-[calc(100vh-4rem)] md:overflow-hidden max-w-full overflow-x-hidden">
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-primary-200 md:overflow-y-auto"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="px-4 py-3 space-y-2 md:p-6 md:space-y-5">
          {/* Back link + Delete */}
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/patients"
              className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove patient"
            >
              <Trash2 size={17} />
            </button>
          </div>

          {/* Delete confirmation modal */}
          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Remove Patient"
            size="sm"
            footer={
              <>
                <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>
                  Cancel
                </Button>
                <Button
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleUnlinkPatient}
                  loading={deleteLoading}
                >
                  Remove
                </Button>
              </>
            }
          >
            <p className="text-text-secondary">
              Permanently delete <span className="font-semibold text-text-primary">{patient?.name}</span>? This will remove all their visits, prescriptions, photos, and lab reports from Supabase. This cannot be undone.
            </p>
          </Modal>

          {/* Avatar + Name — inline on mobile, centered on desktop */}
          <div className="flex items-center gap-3 md:flex-col md:items-center md:text-center">
            <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-primary-200 flex items-center justify-center shrink-0">
              <span className="text-lg md:text-2xl font-bold text-primary-700">
                {getInitials(patient.name)}
              </span>
            </div>
            <div className="min-w-0 flex-1 md:flex-none md:w-full md:px-2">
              <h2 className="text-base md:text-xl font-serif font-bold text-text-primary truncate" title={patient.name}>
                {patient.name}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {patient.patient_display_id || `TVP-${patient.id.slice(0, 4).toUpperCase()}`}
                <span className="ml-2 md:hidden text-text-secondary">
                  {patient.age ? `${patient.age}y` : ""}
                  {patient.gender ? ` ${patient.gender.charAt(0).toUpperCase()}` : ""}
                </span>
              </p>
            </div>
          </div>

          {/* Info rows — hidden on mobile (shown inline above), visible on desktop */}
          <hr className="border-primary-200 hidden md:block" />
          <div className="hidden md:block space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Age | Gender</span>
              <span className="text-text-primary font-medium">
                {patient.age ? `${patient.age} yrs` : "-"}
                {patient.gender
                  ? ` | ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}`
                  : ""}
              </span>
            </div>
            {patient.phone && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted flex items-center gap-1">
                  <Phone size={13} /> Phone
                </span>
                <a
                  href={`tel:${patient.phone}`}
                  className="text-primary-600 font-medium hover:underline"
                >
                  {patient.phone}
                </a>
              </div>
            )}
            {patient.city && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted flex items-center gap-1">
                  <MapPin size={13} /> City
                </span>
                <span className="text-text-primary font-medium">
                  {patient.city}
                </span>
              </div>
            )}
            {(patient as PatientWithDetails).blood_group && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted flex items-center gap-1">
                  <Droplets size={13} /> Blood Group
                </span>
                <span className="text-text-primary font-medium">
                  {(patient as PatientWithDetails).blood_group}
                </span>
              </div>
            )}
          </div>

          {/* Mobile compact summary — badges + quick actions in a row */}
          <div className="md:hidden">
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {(patient as PatientWithDetails).current_diagnosis && (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: "rgba(184,147,106,0.15)", color: "var(--color-text-muted)" }}>
                  {(patient as PatientWithDetails).current_diagnosis}
                </span>
              )}
              {patient.treatment_status && (
                <Badge className={`text-xs ${TREATMENT_STATUS_COLORS[patient.treatment_status] || ""}`}>
                  {TREATMENT_STATUS_OPTIONS.find((o) => o.value === patient.treatment_status)?.label || patient.treatment_status}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="flex-1 justify-center text-xs py-2" onClick={() => setShowVisitModal(true)}>
                <span className="inline-flex items-center gap-1"><Plus size={14} /> Visit</span>
              </Button>
              <Link href="/dashboard/prescriptions" className="flex-1">
                <Button variant="outline" size="sm" className="w-full justify-center text-xs py-2">
                  <span className="inline-flex items-center gap-1"><FileText size={14} /> Rx</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="flex-1 justify-center text-xs py-2" onClick={() => setShowScheduleModal(true)}>
                <span className="inline-flex items-center gap-1"><Calendar size={14} /> Follow-up</span>
              </Button>
            </div>
          </div>

          {/* Desktop full sidebar sections */}
          {(patient as PatientWithDetails).current_diagnosis && (
            <div className="hidden md:block">
              <hr className="border-primary-200" />
              <div className="space-y-2 text-sm mt-5">
                <p className="text-text-muted font-medium text-xs uppercase tracking-wide">
                  Disease Classification
                </p>
                <span className="inline-block px-2.5 py-1 rounded-lg text-sm font-medium" style={{ background: "rgba(184,147,106,0.15)", color: "var(--color-text-muted)" }}>
                  {(patient as PatientWithDetails).current_diagnosis}
                </span>
              </div>
            </div>
          )}

          <hr className="border-primary-200 hidden md:block" />

          {/* Status section */}
          <div className="hidden md:block space-y-2 text-sm">
            <p className="text-text-muted font-medium text-xs uppercase tracking-wide">
              Status
            </p>
            {patient.treatment_status && (
              <Badge
                className={
                  TREATMENT_STATUS_COLORS[patient.treatment_status] || ""
                }
              >
                {TREATMENT_STATUS_OPTIONS.find(
                  (o) => o.value === patient.treatment_status
                )?.label || patient.treatment_status}
              </Badge>
            )}
            <div className="text-text-muted">
              Since: {fmtDate(patient.created_at)}
            </div>
            <div className="text-text-muted">
              Visits: {patient.total_visits ?? 0}
            </div>
          </div>

          <hr className="border-primary-200 hidden md:block" />

          {/* Allergies */}
          <div className="hidden md:block space-y-2">
            <p className="text-text-muted font-medium text-xs uppercase tracking-wide">
              Allergies
            </p>
            {patient.allergies && patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.allergies.map((a, i) => (
                  <span
                    key={i}
                    className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700"
                  >
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-sm">No known allergies</p>
            )}
          </div>

          <hr className="border-primary-200 hidden md:block" />

          {/* Chronic Conditions */}
          <div className="hidden md:block space-y-2">
            <p className="text-text-muted font-medium text-xs uppercase tracking-wide">
              Chronic Conditions
            </p>
            {patient.chronic_conditions &&
            patient.chronic_conditions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.chronic_conditions.map((c, i) => (
                  <span
                    key={i}
                    className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-sm">None recorded</p>
            )}
          </div>

          <hr className="border-primary-200 hidden md:block" />

          {/* Quick Actions — desktop only */}
          <div className="hidden md:block space-y-2">
            <p className="text-text-muted font-medium text-xs uppercase tracking-wide">
              Quick Actions
            </p>
            <Button
              size="sm"
              className="w-full justify-center"
              onClick={() => setShowVisitModal(true)}
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} /> New Visit
              </span>
            </Button>
            <Link href="/dashboard/prescriptions">
              <Button variant="outline" size="sm" className="w-full justify-center mt-1">
                <span className="inline-flex items-center gap-2">
                  <FileText size={16} /> Prescribe
                </span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => setShowScheduleModal(true)}
            >
              <span className="inline-flex items-center gap-2">
                <Calendar size={16} /> Book Follow-up
              </span>
            </Button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden md:min-h-0">
        {/* Tabs */}
        <div className="border-b border-primary-200 bg-primary-50 sticky top-0 z-10 overflow-x-auto">
          <div className="flex gap-0 overflow-x-auto px-4 md:px-6 whitespace-nowrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 md:py-3.5 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-text-muted hover:text-text-primary hover:border-primary-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6">
          {/* ── Tab A: OVERVIEW ────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardBody>
                    <p className="text-text-muted text-sm">Total Visits</p>
                    <p className="text-3xl font-bold text-text-primary mt-1">
                      {patient.total_visits ?? 0}
                    </p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-text-muted text-sm">Last Visit</p>
                    <p className="text-lg font-semibold text-text-primary mt-1">
                      {patient.last_visit_date
                        ? fmtDate(patient.last_visit_date)
                        : "No visits"}
                    </p>
                    {patient.last_visit_date && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatDistanceToNow(
                          new Date(patient.last_visit_date),
                          { addSuffix: true }
                        )}
                      </p>
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-text-muted text-sm">Next Follow-up</p>
                    {nextFollowup ? (
                      <>
                        <p
                          className={`text-lg font-semibold mt-1 ${isOverdue ? "text-red-600" : "text-text-primary"}`}
                        >
                          {isOverdue ? "OVERDUE" : fmtDate(nextFollowup)}
                        </p>
                        {isOverdue && (
                          <p className="text-xs text-red-500 mt-0.5">
                            Was {fmtDate(nextFollowup)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-lg font-semibold text-text-muted mt-1">
                        Not set
                      </p>
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <button
                      type="button"
                      onClick={() => setActiveTab("billing")}
                      className="w-full text-left group"
                    >
                      <p className="text-text-muted text-sm flex items-center gap-1.5">
                        Total Fees
                        <Pencil size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                      </p>
                      <p className="text-3xl font-bold mt-1 text-text-primary">
                        ₹{totalFees.toLocaleString("en-IN")}
                      </p>
                    </button>
                  </CardBody>
                </Card>
              </div>

              {/* AI Screening Result */}
              {aiCase && aiCase.ai_diagnosis !== "pending" && (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-serif font-semibold text-text-primary">
                      AI Screening Result
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-4">
                      <div>
                        <p className="text-xs text-text-muted mb-1">AI Diagnosis</p>
                        <p className="text-base sm:text-lg font-bold text-text-primary break-words">
                          {aiCase.ai_diagnosis_display}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                        style={{
                          background: aiCase.ai_severity_label === "Severe" ? "rgba(220,38,38,0.1)" : aiCase.ai_severity_label === "Moderate" ? "rgba(212,165,90,0.15)" : "rgba(74,154,74,0.12)",
                          color: aiCase.ai_severity_label === "Severe" ? "#dc2626" : aiCase.ai_severity_label === "Moderate" ? "#b8860b" : "#4a9a4a",
                        }}
                      >
                        {aiCase.ai_severity_label}
                      </span>
                    </div>
                    {/* Confidence */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-muted">Confidence</span>
                        <span className="text-sm font-bold" style={{ color: Math.round(aiCase.ai_confidence * 100) >= 75 ? "#4a9a4a" : "#d4a55a" }}>
                          {Math.round(aiCase.ai_confidence * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: "var(--color-primary-200)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round(aiCase.ai_confidence * 100)}%`, background: Math.round(aiCase.ai_confidence * 100) >= 75 ? "#4a9a4a" : "#d4a55a" }} />
                      </div>
                    </div>
                    {/* Top 3 */}
                    {aiCase.ai_top_3.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-text-muted mb-2">Differential Diagnosis</p>
                        <div className="space-y-1.5">
                          {aiCase.ai_top_3.map((pred, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-text-primary">{idx + 1}. {pred.class.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                              <span className="text-text-muted font-semibold">{Math.round(pred.confidence * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Doctor override */}
                    {aiCase.doctor_override_diagnosis && (
                      <div className="pt-3" style={{ borderTop: "1px solid var(--color-separator)" }}>
                        <p className="text-xs text-text-muted mb-1">Doctor&apos;s Final Diagnosis</p>
                        <p className="text-sm font-semibold text-text-primary">{aiCase.doctor_override_diagnosis}</p>
                        {aiCase.doctor_reviewed_at && (
                          <p className="text-xs text-text-muted mt-0.5">
                            Reviewed {new Date(aiCase.doctor_reviewed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Status badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                        background: aiCase.status === "confirmed" || aiCase.status === "approved" ? "rgba(74,154,74,0.12)" : "rgba(184,147,106,0.15)",
                        color: aiCase.status === "confirmed" || aiCase.status === "approved" ? "#4a9a4a" : "#b8936a",
                      }}>
                        {aiCase.status === "confirmed" ? "Doctor Confirmed" : aiCase.status === "approved" ? "Approved" : aiCase.status === "pending_review" ? "Pending Review" : aiCase.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Recent Visit Summary */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-serif font-semibold text-text-primary">
                    Recent Visit Summary
                  </h3>
                </CardHeader>
                <CardBody>
                  {mostRecentVisit ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-muted">
                          {fmtDate(mostRecentVisit.visit_date)}
                        </span>
                        {mostRecentVisit.severity && (
                          <Badge
                            className={
                              SEVERITY_COLORS[mostRecentVisit.severity] || ""
                            }
                          >
                            {SEVERITY_OPTIONS.find(
                              (o) => o.value === mostRecentVisit.severity
                            )?.label || mostRecentVisit.severity}
                          </Badge>
                        )}
                      </div>
                      {mostRecentVisit.chief_complaint && (
                        <p className="text-sm">
                          <span className="text-text-muted">Complaint: </span>
                          <span className="text-text-primary">
                            {mostRecentVisit.chief_complaint}
                          </span>
                        </p>
                      )}
                      {mostRecentVisit.diagnosis && (
                        <p className="text-sm">
                          <span className="text-text-muted">Diagnosis: </span>
                          <span className="text-text-primary font-medium">
                            {mostRecentVisit.diagnosis}
                          </span>
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("visits")}
                      >
                        View Full Visit →
                      </Button>
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm py-4">
                      No visits recorded yet.
                    </p>
                  )}
                </CardBody>
              </Card>

              {/* Active Medications */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-serif font-semibold text-text-primary">
                    Active Medications
                  </h3>
                </CardHeader>
                <CardBody>
                  {activePrescription &&
                  activePrescription.medicines?.length > 0 ? (
                    <div className="space-y-2">
                      {activePrescription.medicines.map(
                        (med: Medicine, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2 border-b border-primary-100 last:border-0"
                          >
                            <span className="text-sm font-medium text-text-primary">
                              {med.name}
                            </span>
                            <span className="text-sm text-text-muted">
                              {med.dosage}
                              {med.frequency
                                ? ` · ${FREQUENCY_OPTIONS.find((f) => f.value === med.frequency)?.label || med.frequency}`
                                : ""}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm py-4">
                      No active medications.
                    </p>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {/* ── Tab B: VISITS ─────────────────────────────────────────────── */}
          {activeTab === "visits" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-semibold text-text-primary">
                  Visit History
                </h3>
                <Button size="sm" onClick={() => setShowVisitModal(true)}>
                  <span className="inline-flex items-center gap-2">
                    <Plus size={16} /> New Visit
                  </span>
                </Button>
              </div>

              {visitsLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-primary-100 rounded-lg" />
                  ))}
                </div>
              ) : visits.length === 0 ? (
                <Card>
                  <CardBody>
                    <p className="text-text-muted text-center py-8">
                      No visits recorded yet. Click &quot;New Visit&quot; to add
                      one.
                    </p>
                  </CardBody>
                </Card>
              ) : (
                visits.map((visit, idx) => {
                  const isExpanded = expandedVisitId === visit.id;
                  const visitNumber = visits.length - idx;
                  const vitals = visit.vitals as Record<string, unknown> | null;

                  return (
                    <Card key={visit.id} className="overflow-hidden">
                      {/* Collapsed header */}
                      <button
                        className="w-full text-left p-3 sm:p-5 flex items-center justify-between hover:bg-primary-50/50 transition-colors gap-2"
                        onClick={() =>
                          setExpandedVisitId(isExpanded ? null : visit.id)
                        }
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                          <span className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                            #{visitNumber}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary">
                              {fmtDate(visit.visit_date)}
                            </p>
                            {visit.chief_complaint && (
                              <p className="text-sm text-text-muted mt-0.5 truncate">
                                {visit.chief_complaint}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          {visit.diagnosis && (
                            <span className="text-sm text-text-secondary hidden sm:inline">
                              {visit.diagnosis}
                            </span>
                          )}
                          {visit.severity && (
                            <Badge
                              className={
                                SEVERITY_COLORS[visit.severity] || ""
                              }
                            >
                              {SEVERITY_OPTIONS.find(
                                (o) => o.value === visit.severity
                              )?.label || visit.severity}
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp size={18} className="text-text-muted" />
                          ) : (
                            <ChevronDown
                              size={18}
                              className="text-text-muted"
                            />
                          )}
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-primary-200 p-3 sm:p-5 space-y-4 bg-surface/50">
                          {/* Vitals */}
                          {vitals && Object.keys(vitals).length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                                Vitals
                              </p>
                              <div className="flex flex-wrap gap-4">
                                {!!vitals.bp && (
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <Heart
                                      size={14}
                                      className="text-red-400"
                                    />
                                    <span className="text-text-muted">
                                      BP:
                                    </span>
                                    <span className="font-medium">
                                      {String(vitals.bp)}
                                    </span>
                                  </div>
                                )}
                                {!!vitals.temperature && (
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <Thermometer
                                      size={14}
                                      className="text-orange-400"
                                    />
                                    <span className="text-text-muted">
                                      Temp:
                                    </span>
                                    <span className="font-medium">
                                      {String(vitals.temperature)}°F
                                    </span>
                                  </div>
                                )}
                                {!!vitals.weight && (
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <Weight
                                      size={14}
                                      className="text-blue-400"
                                    />
                                    <span className="text-text-muted">
                                      Wt:
                                    </span>
                                    <span className="font-medium">
                                      {String(vitals.weight)} kg
                                    </span>
                                  </div>
                                )}
                                {!!vitals.pulse && (
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <Activity
                                      size={14}
                                      className="text-green-500"
                                    />
                                    <span className="text-text-muted">
                                      Pulse:
                                    </span>
                                    <span className="font-medium">
                                      {String(vitals.pulse)} bpm
                                    </span>
                                  </div>
                                )}
                                {!!vitals.spo2 && (
                                  <div className="flex items-center gap-1.5 text-sm">
                                    <Droplets
                                      size={14}
                                      className="text-cyan-500"
                                    />
                                    <span className="text-text-muted">
                                      SpO2:
                                    </span>
                                    <span className="font-medium">
                                      {String(vitals.spo2)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Details grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {visit.examination_notes && (
                              <div className="sm:col-span-2">
                                <span className="text-text-muted">
                                  Examination Notes:{" "}
                                </span>
                                <span className="text-text-primary">
                                  {visit.examination_notes}
                                </span>
                              </div>
                            )}
                            {visit.diagnosis && (
                              <div>
                                <span className="text-text-muted">
                                  Diagnosis:{" "}
                                </span>
                                <span className="text-text-primary font-medium">
                                  {visit.diagnosis}
                                </span>
                              </div>
                            )}
                            {visit.body_location && (
                              <div>
                                <span className="text-text-muted">
                                  Body Location:{" "}
                                </span>
                                <span className="text-text-primary">
                                  {visit.body_location}
                                </span>
                              </div>
                            )}
                            {visit.treatment_given && (
                              <div className="sm:col-span-2">
                                <span className="text-text-muted">
                                  Treatment Given:{" "}
                                </span>
                                <span className="text-text-primary">
                                  {visit.treatment_given}
                                </span>
                              </div>
                            )}
                            {visit.visit_fee != null && (
                              <div>
                                <span className="text-text-muted">Fee: </span>
                                <span className="text-text-primary font-medium">
                                  ₹{visit.visit_fee}
                                </span>
                                {visit.fee_paid != null && (
                                  <span
                                    className={`ml-2 text-xs ${visit.fee_paid ? "text-green-600" : "text-red-500"}`}
                                  >
                                    {visit.fee_paid ? "(Paid)" : "(Unpaid)"}
                                  </span>
                                )}
                              </div>
                            )}
                            {visit.duration_minutes && (
                              <div>
                                <span className="text-text-muted">
                                  Duration:{" "}
                                </span>
                                <span className="text-text-primary">
                                  {visit.duration_minutes} min
                                </span>
                              </div>
                            )}
                            {visit.doctor_notes && (
                              <div className="sm:col-span-2">
                                <span className="text-text-muted">
                                  Doctor Notes:{" "}
                                </span>
                                <span className="text-text-primary">
                                  {visit.doctor_notes}
                                </span>
                              </div>
                            )}
                            {visit.follow_up_date && (
                              <div>
                                <span className="text-text-muted">
                                  Follow-up:{" "}
                                </span>
                                <span className="text-text-primary font-medium">
                                  {fmtDate(visit.follow_up_date)}
                                </span>
                              </div>
                            )}
                            {visit.lab_tests && (
                              <div>
                                <span className="text-text-muted">
                                  Lab Tests:{" "}
                                </span>
                                <span className="text-text-primary">
                                  {visit.lab_tests}
                                </span>
                              </div>
                            )}
                          </div>

                          {user?.id && !visit.id.startsWith("temp-") && (
                            <div className="pt-2">
                              <FeedbackLinkButton
                                doctorId={user.id}
                                patientId={patient.id}
                                visitId={visit.id}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ── Tab C: PRESCRIPTIONS ──────────────────────────────────────── */}
          {activeTab === "prescriptions" && (
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-semibold text-text-primary">
                Prescriptions
              </h3>

              {prescriptionsLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-primary-100 rounded-lg" />
                  ))}
                </div>
              ) : prescriptions.length === 0 ? (
                <Card>
                  <CardBody>
                    <p className="text-text-muted text-center py-8">
                      No prescriptions found.
                    </p>
                  </CardBody>
                </Card>
              ) : (
                prescriptions.map((rx) => {
                  const isExpanded = expandedPrescriptionId === rx.id;
                  return (
                    <Card key={rx.id} className="overflow-hidden">
                      <button
                        className="w-full text-left p-3 sm:p-5 flex items-center justify-between hover:bg-primary-50/50 transition-colors gap-2"
                        onClick={() =>
                          setExpandedPrescriptionId(
                            isExpanded ? null : rx.id
                          )
                        }
                      >
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                          <FileText
                            size={20}
                            className="text-primary-500 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary">
                              {fmtDate(rx.created_at)}
                            </p>
                            <p className="text-sm text-text-muted mt-0.5 truncate">
                              {rx.diagnosis} · {rx.medicines?.length || 0}{" "}
                              medicine{rx.medicines?.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              rx.status === "active" ? "success" : "default"
                            }
                          >
                            {rx.status.charAt(0).toUpperCase() +
                              rx.status.slice(1)}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp size={18} className="text-text-muted" />
                          ) : (
                            <ChevronDown
                              size={18}
                              className="text-text-muted"
                            />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-primary-200 p-3 sm:p-5 space-y-4 bg-surface/50">
                          {/* Medicine table */}
                          {rx.medicines && rx.medicines.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-primary-200">
                                    <th className="text-left py-2 text-text-muted font-medium">
                                      Medicine
                                    </th>
                                    <th className="text-left py-2 text-text-muted font-medium">
                                      Dosage
                                    </th>
                                    <th className="text-left py-2 text-text-muted font-medium">
                                      Frequency
                                    </th>
                                    <th className="text-left py-2 text-text-muted font-medium">
                                      Duration
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rx.medicines.map(
                                    (med: Medicine, i: number) => (
                                      <tr
                                        key={i}
                                        className="border-b border-primary-100 last:border-0"
                                      >
                                        <td className="py-2 text-text-primary font-medium">
                                          {med.name}
                                        </td>
                                        <td className="py-2 text-text-secondary">
                                          {med.dosage}
                                        </td>
                                        <td className="py-2 text-text-secondary">
                                          {FREQUENCY_OPTIONS.find(
                                            (f) => f.value === med.frequency
                                          )?.label || med.frequency}
                                        </td>
                                        <td className="py-2 text-text-secondary">
                                          {med.duration}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {rx.special_instructions && (
                            <div className="text-sm">
                              <span className="text-text-muted">
                                Special Instructions:{" "}
                              </span>
                              <span className="text-text-primary">
                                {rx.special_instructions}
                              </span>
                            </div>
                          )}
                          {rx.follow_up_date && (
                            <div className="text-sm">
                              <span className="text-text-muted">
                                Follow-up:{" "}
                              </span>
                              <span className="text-text-primary">
                                {fmtDate(rx.follow_up_date)}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {rx.pdf_url && (
                              <>
                                <a
                                  href={rx.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
                                  style={{ background: "#b8936a" }}
                                >
                                  <FileText size={14} /> View PDF
                                </a>
                                <a
                                  href={rx.pdf_url}
                                  download
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                  style={{ background: "rgba(184,147,106,0.12)", color: "#7a5c35" }}
                                >
                                  <ArrowLeft size={14} className="rotate-[270deg]" /> Download
                                </a>
                                {patient?.phone && (
                                  <a
                                    href={`https://wa.me/${patient.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Your prescription is ready. Download here: ${rx.pdf_url}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    style={{ background: "rgba(45,74,62,0.1)", color: "#2d4a3e" }}
                                  >
                                    Share WhatsApp
                                  </a>
                                )}
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => duplicatePrescription(rx)}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Copy size={14} /> Duplicate
                              </span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ── Tab D: PHOTOS & SKIN AI ───────────────────────────────────── */}
          {activeTab === "photos" && (
            <PatientPhotosTab patientId={params.id} />
          )}

          {/* ── Tab E: LAB REPORTS ────────────────────────────────────────── */}
          {activeTab === "lab_reports" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif font-semibold text-text-primary">Lab Reports</h3>
                <Button variant="outline" size="sm" onClick={() => { setLabError(""); setShowLabModal(true); }}>
                  <span className="inline-flex items-center gap-2">
                    <Upload size={16} /> Upload Report
                  </span>
                </Button>
              </div>

              {labReports.length === 0 && wizardRecords.length === 0 ? (
                <Card>
                  <CardBody>
                    <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                      <FlaskConical size={48} className="mb-4 opacity-30" />
                      <p className="text-lg font-medium">No lab reports yet</p>
                      <p className="text-sm mt-1">Upload and manage lab results for this patient.</p>
                    </div>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-3">
                  {labReports.map((report, idx) => (
                    <Card key={idx}>
                      <CardBody>
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-primary-100 border border-primary-200">
                              {report.file_type?.startsWith("image/") ? (
                                <img
                                  src={report.file_url}
                                  alt={report.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText size={24} className="text-primary-500" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary">{report.title}</p>
                              <p className="text-sm text-text-secondary">{report.date}</p>
                              {report.notes && <p className="text-sm text-text-muted mt-1">{report.notes}</p>}
                              <p className="text-xs text-text-muted mt-1">
                                Uploaded {new Date(report.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleLabDownload(report)}
                              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleLabDelete(idx)}
                              className="p-1 text-text-muted hover:text-red-500 transition-colors"
                              title="Delete report"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}

                  {/* Records uploaded during patient registration */}
                  {wizardRecords.map((record) => {
                    const isImage = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(record.photo_url) || record.photo_url.includes("image");
                    return (
                      <Card key={record.id}>
                        <CardBody>
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-primary-100 border border-primary-200">
                                {isImage ? (
                                  <img src={record.photo_url} alt={record.notes || "Medical record"} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FileText size={24} className="text-primary-500" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-text-primary">{record.notes || "Medical record"}</p>
                                <p className="text-xs text-text-muted mt-1">
                                  Uploaded {new Date(record.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface)", color: "var(--color-text-secondary)" }}>
                                  Added during registration
                                </span>
                              </div>
                            </div>
                            {isImage ? (
                              <button
                                type="button"
                                onClick={() => setViewingRecord(record)}
                                className="text-sm text-primary-500 hover:text-primary-600 font-medium flex-shrink-0"
                              >
                                View
                              </button>
                            ) : (
                              <a
                                href={record.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary-500 hover:text-primary-600 font-medium flex-shrink-0"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Image viewer modal */}
              <Modal
                isOpen={!!viewingRecord}
                onClose={() => setViewingRecord(null)}
                title={viewingRecord?.notes || "Medical record"}
                size="xl"
                footer={<Button variant="ghost" onClick={() => setViewingRecord(null)}>Close</Button>}
              >
                {viewingRecord && (
                  <img
                    src={viewingRecord.photo_url}
                    alt={viewingRecord.notes || "Medical record"}
                    className="w-full max-h-[70vh] object-contain rounded-lg"
                  />
                )}
              </Modal>

              {/* Upload Modal */}
              <Modal
                isOpen={showLabModal}
                onClose={() => setShowLabModal(false)}
                title="Upload Lab Report"
                size="md"
                footer={
                  <>
                    <Button variant="outline" onClick={() => setShowLabModal(false)} disabled={labUploading}>Cancel</Button>
                    <Button className="bg-primary-500 hover:bg-primary-600 text-white" onClick={handleLabUpload} loading={labUploading} disabled={!labFile}>
                      Upload
                    </Button>
                  </>
                }
              >
                <form
                  onSubmit={handleLabUpload}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement) && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.requestSubmit();
                    }
                  }}
                  className="space-y-4"
                >
                  {labError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{labError}</div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Report File <span style={{ color: "var(--form-error)" }}>*</span>
                    </label>
                    <input
                      ref={labFormValidation.setFieldRef("labFile")}
                      type="file"
                      accept="image/*,.pdf"
                      className={`w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-100 file:text-primary-500 hover:file:bg-primary-200 ${labFormValidation.errors.labFile ? "field-error-input rounded-lg p-2" : ""}`}
                      onChange={(e) => { setLabFile(e.target.files?.[0] ?? null); labFormValidation.clearError("labFile"); }}
                    />
                    {labFormValidation.errors.labFile && (
                      <span className="field-error-message">{labFormValidation.errors.labFile}</span>
                    )}
                  </div>
                  <Input
                    label="Report Title"
                    placeholder="e.g. CBC, Thyroid Panel, Skin Biopsy"
                    value={labForm.title}
                    onChange={(e) => setLabForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <Input
                    label="Report Date"
                    type="date"
                    value={labForm.date}
                    onChange={(e) => setLabForm((f) => ({ ...f, date: e.target.value }))}
                  />
                  <Textarea
                    label="Notes (optional)"
                    placeholder="Any additional notes about this report..."
                    value={labForm.notes}
                    onChange={(e) => setLabForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                  />
                  <FormErrorSummary errors={labFormValidation.errors} fieldLabels={labFieldLabels} />
                  <button type="submit" className="hidden" />
                </form>
              </Modal>
            </div>
          )}

          {/* ── Tab: PACKAGES ────────────────────────────────────────────── */}
          {activeTab === "packages" && user && (
            <PatientPackagesTab doctorId={user.id} patientId={params.id} />
          )}

          {/* ── Tab: PROGRESS PHOTOS ─────────────────────────────────────── */}
          {activeTab === "progress" && user && (
            <PatientProgressPhotosTab
              doctorId={user.id}
              patientId={params.id}
              patientName={patient?.name}
            />
          )}

          {/* ── Tab: BODY MAP ────────────────────────────────────────────── */}
          {activeTab === "body_map" && user && (
            <PatientBodyMapTab
              doctorId={user.id}
              patientId={params.id}
              visits={visits.map((v) => ({
                id: v.id,
                visit_date: v.visit_date,
                diagnosis: v.diagnosis,
              }))}
            />
          )}

          {/* ── Tab: INVOICES ────────────────────────────────────────────── */}
          {activeTab === "invoices" && user && (
            <PatientInvoicesTab
              doctorId={user.id}
              patientId={params.id}
              patientName={patient?.name}
              patientStateCode={null}
              visits={visits.map((v) => ({
                id: v.id,
                visit_date: v.visit_date,
                diagnosis: v.diagnosis,
              }))}
            />
          )}

          {/* ── Tab F: BILLING ────────────────────────────────────────────── */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg sm:text-xl font-serif font-semibold text-text-primary">
                  Billing
                </h3>
                <Button variant="primary" size="sm" onClick={() => setShowAddFeeModal(true)}>
                  <span className="inline-flex items-center gap-1.5"><Plus size={14} /> Add Fee</span>
                </Button>
              </div>

              {/* Summary card */}
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-text-muted text-sm">Total Fees</p>
                      <p className="text-2xl sm:text-3xl font-bold text-text-primary mt-1">
                        ₹{totalFees.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <DollarSign size={40} className="text-primary-200 opacity-50 flex-shrink-0" />
                  </div>
                </CardBody>
              </Card>

              {/* Fees table */}
              <Card>
                <CardBody>
                  {patientFees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                      <DollarSign size={36} className="mb-3 opacity-30" />
                      <p className="text-sm">No billing records found.</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddFeeModal(true)}>
                        Add First Fee
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-primary-200">
                            <th className="text-left py-2 text-text-muted font-medium">Date</th>
                            <th className="text-left py-2 text-text-muted font-medium">Description</th>
                            <th className="text-right py-2 text-text-muted font-medium">Fee</th>
                            <th className="text-center py-2 text-text-muted font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientFees.map((fee) => {
                            const visit = visits.find((v) => v.id === fee.visit_id);
                            const statusColors: Record<string, string> = {
                              paid: "bg-emerald-50 text-emerald-700",
                              unpaid: "bg-red-50 text-red-600",
                              waived: "bg-stone-100 text-stone-600",
                            };
                            const isEditing = editingFeeId === fee.id;
                            return (
                              <tr key={fee.id} className="border-b border-primary-100 last:border-0">
                                <td className="py-3 text-text-primary">
                                  {fmtDate(fee.created_at?.split("T")[0])}
                                </td>
                                <td className="py-3 text-text-secondary">
                                  {visit?.diagnosis || visit?.chief_complaint || "Consultation"}
                                </td>
                                <td className="py-3 text-right text-text-primary font-medium">
                                  {isEditing ? (
                                    <form
                                      className="inline-flex items-center gap-1 justify-end"
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const val = parseFloat(editingFeeValue);
                                        if (val >= 0) updateFeeAmount(fee.id, val);
                                        setEditingFeeId(null);
                                      }}
                                    >
                                      <span className="text-text-muted">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        autoFocus
                                        value={editingFeeValue}
                                        onChange={(e) => setEditingFeeValue(e.target.value)}
                                        onBlur={() => {
                                          const val = parseFloat(editingFeeValue);
                                          if (val >= 0) updateFeeAmount(fee.id, val);
                                          setEditingFeeId(null);
                                        }}
                                        className="w-20 px-2 py-1 text-right text-sm rounded border outline-none"
                                        style={{ borderColor: "#b8936a" }}
                                      />
                                    </form>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => { setEditingFeeId(fee.id); setEditingFeeValue(String(fee.amount)); }}
                                      className="inline-flex items-center gap-1.5 group hover:opacity-70 transition-opacity"
                                    >
                                      ₹{Number(fee.amount).toLocaleString("en-IN")}
                                      <Pencil size={11} className="opacity-0 group-hover:opacity-60" />
                                    </button>
                                  )}
                                </td>
                                <td className="py-3 text-center">
                                  <select
                                    value={fee.status}
                                    onChange={(e) => updateFeeStatus(fee.id, e.target.value)}
                                    className={`appearance-none text-center text-xs font-semibold px-3 py-1 rounded-full cursor-pointer outline-none border-0 ${statusColors[fee.status] ?? statusColors.unpaid}`}
                                  >
                                    <option value="paid">Paid</option>
                                    <option value="unpaid">Unpaid</option>
                                    <option value="waived">Waived</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Add Fee Modal */}
              <Modal isOpen={showAddFeeModal} onClose={() => setShowAddFeeModal(false)} title="Add Fee" size="sm">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-text-muted block mb-1">Amount</label>
                    <div className="flex items-center rounded-lg overflow-hidden border border-primary-200">
                      <span className="px-3 py-2.5 text-sm text-text-muted border-r border-primary-200">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 500"
                        value={newFeeAmount}
                        onChange={(e) => setNewFeeAmount(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-text-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-muted block mb-1">Status</label>
                    <div className="flex gap-2">
                      {(["unpaid", "paid", "waived"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewFeeStatus(s)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold capitalize"
                          style={newFeeStatus === s
                            ? { background: "#b8936a", color: "#fff" }
                            : { background: "var(--color-primary-200)", color: "#7a5c35" }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button variant="primary" className="w-full" onClick={handleAddFee} disabled={addingFee || !newFeeAmount}>
                    {addingFee ? "Adding..." : "Add Fee"}
                  </Button>
                </div>
              </Modal>
            </div>
          )}
        </div>
      </div>

      {/* ── NEW VISIT MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        title="New Visit"
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVisitModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={visitSubmitting}
              onClick={handleVisitSubmit}
            >
              Save Visit
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleVisitSubmit}
          className="space-y-5 max-h-[70vh] overflow-y-auto pr-1"
        >
          {/* Allergy Warning */}
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle
                size={18}
                className="text-red-600 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  ALLERGY WARNING
                </p>
                <p className="text-sm text-red-600">
                  Patient allergic to: {patient.allergies.join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Visit Date */}
          <Input
            ref={visitFormValidation.setFieldRef("visit_date")}
            label="Visit Date"
            name="visit_date"
            type="date"
            value={visitForm.visit_date}
            onChange={(e) => { handleVisitChange(e); visitFormValidation.clearError("visit_date"); }}
            required
            error={visitFormValidation.errors.visit_date}
          />

          {/* Vitals row */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              Vitals
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <Input
                placeholder="BP (120/80)"
                name="bp"
                value={visitForm.bp}
                onChange={handleVisitChange}
              />
              <Input
                placeholder="Temp °F"
                name="temperature"
                type="number"
                step="0.1"
                value={visitForm.temperature}
                onChange={handleVisitChange}
              />
              <Input
                placeholder="Weight kg"
                name="weight"
                type="number"
                step="0.1"
                value={visitForm.weight}
                onChange={handleVisitChange}
              />
              <Input
                placeholder="Pulse bpm"
                name="pulse"
                type="number"
                value={visitForm.pulse}
                onChange={handleVisitChange}
              />
              <Input
                placeholder="SpO2 %"
                name="spo2"
                type="number"
                value={visitForm.spo2}
                onChange={handleVisitChange}
              />
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <Input
              ref={visitFormValidation.setFieldRef("chief_complaint")}
              label="Chief Complaint"
              name="chief_complaint"
              value={visitForm.chief_complaint}
              onChange={(e) => { handleVisitChange(e); visitFormValidation.clearError("chief_complaint"); }}
              placeholder="Describe the main complaint..."
              required
              error={visitFormValidation.errors.chief_complaint}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_COMPLAINTS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => appendComplaint(chip)}
                  className="px-2.5 py-1 text-xs rounded-full border border-primary-300 text-primary-600 hover:bg-primary-100 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Examination Notes */}
          <Textarea
            label="Examination Notes"
            name="examination_notes"
            value={visitForm.examination_notes}
            onChange={handleVisitChange}
            rows={3}
            placeholder="Physical examination findings..."
          />

          {/* Diagnosis with autocomplete */}
          <div className="relative">
            <Input
              label="Diagnosis"
              name="diagnosis"
              value={visitForm.diagnosis}
              onChange={handleVisitChange}
              onFocus={() => setDiagnosisFocused(true)}
              onBlur={() =>
                setTimeout(() => setDiagnosisFocused(false), 200)
              }
              placeholder="Start typing..."
              autoComplete="off"
            />
            {diagnosisSuggestions.length > 0 && diagnosisFocused && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-primary-200 rounded-lg shadow-lg overflow-hidden">
                {diagnosisSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-primary-50 transition-colors"
                    onMouseDown={() => {
                      setVisitForm((prev) => ({
                        ...prev,
                        diagnosis: sug,
                      }));
                      setDiagnosisFocused(false);
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Severity radio */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              Severity
            </p>
            <div className="flex flex-wrap gap-3">
              {SEVERITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    visitForm.severity === opt.value
                      ? "border-primary-500 bg-primary-50"
                      : "border-primary-200 hover:border-primary-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={opt.value}
                    checked={visitForm.severity === opt.value}
                    onChange={handleVisitChange}
                    className="accent-primary-500"
                  />
                  <span className="text-sm text-text-primary">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Body Location */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Body Location
            </label>
            <select
              name="body_location"
              className={selectClass}
              value={visitForm.body_location}
              onChange={handleVisitChange}
            >
              <option value="">Select Location</option>
              {BODY_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Prescription / Medicines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">
                Prescription Medicines
              </p>
              <button
                type="button"
                onClick={addMedicineRow}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add Medicine
              </button>
            </div>
            {visitMedicines.length === 0 ? (
              <p className="text-sm text-text-muted">
                No medicines added. Click &quot;+ Add Medicine&quot; to begin.
              </p>
            ) : (
              <div className="space-y-3">
                {visitMedicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_0.6fr_0.8fr_0.6fr_auto] gap-2 items-end"
                  >
                    <Input
                      placeholder="Medicine name"
                      value={med.name}
                      onChange={(e) =>
                        updateMedicine(idx, "name", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Dosage"
                      value={med.dosage}
                      onChange={(e) =>
                        updateMedicine(idx, "dosage", e.target.value)
                      }
                    />
                    <select
                      className={selectClass}
                      value={med.frequency}
                      onChange={(e) =>
                        updateMedicine(idx, "frequency", e.target.value)
                      }
                    >
                      <option value="">Frequency</option>
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Duration"
                      value={med.duration}
                      onChange={(e) =>
                        updateMedicine(idx, "duration", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeMedicine(idx)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lab Tests */}
          <Input
            label="Lab Tests"
            name="lab_tests"
            value={visitForm.lab_tests}
            onChange={handleVisitChange}
            placeholder="e.g., CBC, LFT, Blood Sugar..."
          />

          {/* Follow-up Date */}
          <Input
            label="Follow-up Date"
            name="follow_up_date"
            type="date"
            value={visitForm.follow_up_date}
            onChange={handleVisitChange}
          />

          {/* Consultation Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Consultation Fee
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  name="visit_fee"
                  value={visitForm.visit_fee}
                  onChange={handleVisitChange}
                  placeholder="0"
                  className="w-full pl-7 pr-4 py-2.5 border border-primary-200 rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 pb-2 cursor-pointer">
              <input
                type="checkbox"
                name="fee_paid"
                checked={visitForm.fee_paid}
                onChange={handleVisitChange}
                className="w-4 h-4 accent-primary-500"
              />
              <span className="text-sm text-text-primary">Paid</span>
            </label>
          </div>

          {/* Doctor Notes */}
          <Textarea
            label="Doctor Notes (private)"
            name="doctor_notes"
            value={visitForm.doctor_notes}
            onChange={handleVisitChange}
            rows={2}
            placeholder="Internal notes..."
          />

          <FormErrorSummary errors={visitFormValidation.errors} fieldLabels={visitFieldLabels} />
        </form>
      </Modal>

      {/* ── SCHEDULE FOLLOW-UP MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Book Follow-up"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={scheduleSubmitting}
              onClick={handleScheduleSubmit}
            >
              Schedule
            </Button>
          </>
        }
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <Input
            ref={followUpValidation.setFieldRef("scheduleDate")}
            label="Follow-up Date"
            type="date"
            value={scheduleDate}
            onChange={(e) => { setScheduleDate(e.target.value); followUpValidation.clearError("scheduleDate"); }}
            required
            error={followUpValidation.errors.scheduleDate}
          />
          <Input
            label="Preferred Time"
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
          />
          <FormErrorSummary errors={followUpValidation.errors} fieldLabels={followUpFieldLabels} />
        </form>
      </Modal>
    </main>
  );
}
