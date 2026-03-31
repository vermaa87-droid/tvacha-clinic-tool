"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { PatientPhotosTab } from "@/components/PatientPhotosTab";
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
  | "lab_reports"
  | "billing";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Activity size={16} /> },
  { key: "visits", label: "Visits", icon: <Clipboard size={16} /> },
  { key: "prescriptions", label: "Prescriptions", icon: <FileText size={16} /> },
  { key: "photos", label: "Photos & Skin AI", icon: <Camera size={16} /> },
  { key: "lab_reports", label: "Lab Reports", icon: <FlaskConical size={16} /> },
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

  // Patient data
  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Visit data & modal
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState(INITIAL_VISIT_FORM);
  const [visitMedicines, setVisitMedicines] = useState<MedicineRow[]>([]);
  const [visitSubmitting, setVisitSubmitting] = useState(false);
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
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  // ─── Fetch patient ───────────────────────────────────────────────────────

  const fetchPatient = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", params.id)
        .eq("linked_doctor_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setPatient(data as PatientWithDetails);
    } catch (err) {
      console.error("[patient-detail] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch visits ────────────────────────────────────────────────────────

  const fetchVisits = async () => {
    if (!user) return;
    try {
      setVisitsLoading(true);
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
  };

  // ─── Fetch prescriptions ────────────────────────────────────────────────

  const fetchPrescriptions = async () => {
    if (!user) return;
    try {
      setPrescriptionsLoading(true);
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
  };

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    fetchPatient();
    fetchVisits();
    fetchPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id]);

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

    try {
      setVisitSubmitting(true);

      const vitals: Record<string, unknown> = {};
      if (visitForm.bp) vitals.bp = visitForm.bp;
      if (visitForm.temperature)
        vitals.temperature = parseFloat(visitForm.temperature);
      if (visitForm.weight) vitals.weight = parseFloat(visitForm.weight);
      if (visitForm.pulse) vitals.pulse = parseInt(visitForm.pulse, 10);
      if (visitForm.spo2) vitals.spo2 = parseInt(visitForm.spo2, 10);

      const { error } = await supabase.from("visits").insert({
        patient_id: patient.id,
        doctor_id: user.id,
        visit_date: visitForm.visit_date,
        chief_complaint: visitForm.chief_complaint || null,
        examination_notes: visitForm.examination_notes || null,
        diagnosis: visitForm.diagnosis || null,
        severity: visitForm.severity || null,
        body_location: visitForm.body_location || null,
        treatment_given: visitForm.treatment_given || null,
        vitals: Object.keys(vitals).length > 0 ? vitals : null,
        visit_fee: visitForm.visit_fee
          ? parseFloat(visitForm.visit_fee)
          : null,
        fee_paid: visitForm.fee_paid,
        duration_minutes: null,
        doctor_notes: visitForm.doctor_notes || null,
        follow_up_date: visitForm.follow_up_date || null,
        lab_tests: visitForm.lab_tests || null,
      });

      if (error) throw error;

      // Update patient last_visit_date and total_visits
      const patientUpdate: Record<string, unknown> = {
        last_visit_date: visitForm.visit_date,
        total_visits: (patient.total_visits || 0) + 1,
      };
      if (visitForm.follow_up_date) {
        patientUpdate.next_followup_date = visitForm.follow_up_date;
      }
      await supabase
        .from("patients")
        .update(patientUpdate)
        .eq("id", patient.id);

      // Create prescription if medicines were added
      if (visitMedicines.length > 0 && visitMedicines.some((m) => m.name)) {
        const validMedicines = visitMedicines.filter((m) => m.name.trim());
        if (validMedicines.length > 0) {
          await supabase.from("prescriptions").insert({
            doctor_id: user.id,
            patient_id: patient.id,
            diagnosis: visitForm.diagnosis || "General",
            medicines: validMedicines,
            follow_up_date: visitForm.follow_up_date || null,
            status: "active",
          });
        }
      }

      setVisitForm(INITIAL_VISIT_FORM);
      setVisitMedicines([]);
      setShowVisitModal(false);
      await Promise.all([fetchVisits(), fetchPatient(), fetchPrescriptions()]);
    } catch (err) {
      console.error("[patient-detail] visit insert error:", err);
    } finally {
      setVisitSubmitting(false);
    }
  };

  // ─── Schedule follow-up ─────────────────────────────────────────────────

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patient || !scheduleDate) return;

    try {
      setScheduleSubmitting(true);

      await supabase.from("appointments").insert({
        patient_id: patient.id,
        doctor_id: user.id,
        appointment_date: scheduleDate,
        appointment_time: scheduleTime || "10:00",
        type: "in_person",
        duration_minutes: 30,
        status: "scheduled",
        notes: "Follow-up appointment",
      });

      await supabase
        .from("patients")
        .update({ next_followup_date: scheduleDate })
        .eq("id", patient.id);

      setScheduleDate("");
      setScheduleTime("");
      setShowScheduleModal(false);
      await fetchPatient();
    } catch (err) {
      console.error("[patient-detail] schedule error:", err);
    } finally {
      setScheduleSubmitting(false);
    }
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
    <main className="flex flex-col md:flex-row md:h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-primary-200 overflow-y-auto"
        style={{ backgroundColor: "#f5f2ed" }}
      >
        <div className="p-6 space-y-5">
          {/* Back link */}
          <Link
            href="/dashboard/patients"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          {/* Avatar + Name */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary-200 flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-primary-700">
                {getInitials(patient.name)}
              </span>
            </div>
            <h2 className="text-xl font-serif font-bold text-text-primary">
              {patient.name}
            </h2>
            <p className="text-sm text-text-muted mt-0.5">
              {patient.patient_display_id ||
                `TVP-${patient.id.slice(0, 4).toUpperCase()}`}
            </p>
          </div>

          <hr className="border-primary-200" />

          {/* Info rows */}
          <div className="space-y-3 text-sm">
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

          <hr className="border-primary-200" />

          {/* Status section */}
          <div className="space-y-2 text-sm">
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

          <hr className="border-primary-200" />

          {/* Allergies */}
          <div className="space-y-2">
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

          <hr className="border-primary-200" />

          {/* Chronic Conditions */}
          <div className="space-y-2">
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

          <hr className="border-primary-200" />

          {/* Quick Actions */}
          <div className="space-y-2">
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
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Tabs */}
        <div className="border-b border-primary-200 bg-primary-50 sticky top-0 z-10 overflow-x-auto">
          <div className="flex gap-0 overflow-x-auto px-4 md:px-6 whitespace-nowrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

        <div className="p-6">
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
                    <p className="text-text-muted text-sm">
                      Outstanding Balance
                    </p>
                    <p className="text-3xl font-bold text-text-primary mt-1">
                      ₹0
                    </p>
                  </CardBody>
                </Card>
              </div>

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
                        className="w-full text-left p-5 flex items-center justify-between hover:bg-primary-50/50 transition-colors"
                        onClick={() =>
                          setExpandedVisitId(isExpanded ? null : visit.id)
                        }
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-700">
                            #{visitNumber}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {fmtDate(visit.visit_date)}
                            </p>
                            {visit.chief_complaint && (
                              <p className="text-sm text-text-muted mt-0.5">
                                {visit.chief_complaint}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
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
                        <div className="border-t border-primary-200 p-5 space-y-4 bg-surface/50">
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
                        className="w-full text-left p-5 flex items-center justify-between hover:bg-primary-50/50 transition-colors"
                        onClick={() =>
                          setExpandedPrescriptionId(
                            isExpanded ? null : rx.id
                          )
                        }
                      >
                        <div className="flex items-center gap-4">
                          <FileText
                            size={20}
                            className="text-primary-500 shrink-0"
                          />
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {fmtDate(rx.created_at)}
                            </p>
                            <p className="text-sm text-text-muted mt-0.5">
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
                        <div className="border-t border-primary-200 p-5 space-y-4 bg-surface/50">
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
                <h3 className="text-xl font-serif font-semibold text-text-primary">
                  Lab Reports
                </h3>
                <Button variant="outline" size="sm" disabled>
                  <span className="inline-flex items-center gap-2">
                    <FlaskConical size={16} /> Upload Report
                  </span>
                </Button>
              </div>

              <Card>
                <CardBody>
                  <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                    <FlaskConical size={48} className="mb-4 opacity-30" />
                    <p className="text-lg font-medium">
                      Lab report management coming soon
                    </p>
                    <p className="text-sm mt-1">
                      Upload and manage lab results for this patient.
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* ── Tab F: BILLING ────────────────────────────────────────────── */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <h3 className="text-xl font-serif font-semibold text-text-primary">
                Billing
              </h3>

              {/* Outstanding balance */}
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-muted text-sm">
                        Total Outstanding Balance
                      </p>
                      <p className="text-3xl font-bold text-text-primary mt-1">
                        ₹
                        {visits
                          .filter((v) => v.visit_fee && !v.fee_paid)
                          .reduce((sum, v) => sum + (v.visit_fee || 0), 0)}
                      </p>
                    </div>
                    <DollarSign
                      size={40}
                      className="text-primary-200 opacity-50"
                    />
                  </div>
                </CardBody>
              </Card>

              {/* Visits billing table */}
              <Card>
                <CardBody>
                  {visits.filter((v) => v.visit_fee != null).length === 0 ? (
                    <p className="text-text-muted text-center py-8 text-sm">
                      No billing records found.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-primary-200">
                            <th className="text-left py-2 text-text-muted font-medium">
                              Date
                            </th>
                            <th className="text-left py-2 text-text-muted font-medium">
                              Description
                            </th>
                            <th className="text-right py-2 text-text-muted font-medium">
                              Fee
                            </th>
                            <th className="text-center py-2 text-text-muted font-medium">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits
                            .filter((v) => v.visit_fee != null)
                            .map((v) => (
                              <tr
                                key={v.id}
                                className="border-b border-primary-100 last:border-0"
                              >
                                <td className="py-3 text-text-primary">
                                  {fmtDate(v.visit_date)}
                                </td>
                                <td className="py-3 text-text-secondary">
                                  {v.diagnosis || v.chief_complaint || "Visit"}
                                </td>
                                <td className="py-3 text-right text-text-primary font-medium">
                                  ₹{v.visit_fee}
                                </td>
                                <td className="py-3 text-center">
                                  <Badge
                                    variant={
                                      v.fee_paid ? "success" : "error"
                                    }
                                  >
                                    {v.fee_paid ? "Paid" : "Unpaid"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>
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
            label="Visit Date"
            name="visit_date"
            type="date"
            value={visitForm.visit_date}
            onChange={handleVisitChange}
          />

          {/* Vitals row */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">
              Vitals
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
              label="Chief Complaint"
              name="chief_complaint"
              value={visitForm.chief_complaint}
              onChange={handleVisitChange}
              placeholder="Describe the main complaint..."
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
                    className="grid grid-cols-[1fr_0.6fr_0.8fr_0.6fr_auto] gap-2 items-end"
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
          <div className="grid grid-cols-2 gap-4 items-end">
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
              disabled={!scheduleDate}
            >
              Schedule
            </Button>
          </>
        }
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <Input
            label="Follow-up Date"
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
          <Input
            label="Preferred Time"
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
          />
        </form>
      </Modal>
    </main>
  );
}
