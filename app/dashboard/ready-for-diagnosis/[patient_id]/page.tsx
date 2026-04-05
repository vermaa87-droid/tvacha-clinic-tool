"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { ArrowLeft, X } from "lucide-react";

// ─── Diagnosis options ─────────────────────────────────────────────────────────

const DIAGNOSIS_OPTIONS = [
  { value: "healthy", label: "Healthy Skin" },
  { value: "acne", label: "Acne" },
  { value: "fungal_infection", label: "Fungal Infection" },
  { value: "eczema", label: "Eczema (Atopic Dermatitis)" },
  { value: "contact_dermatitis", label: "Contact Dermatitis" },
  { value: "urticaria", label: "Urticaria (Hives)" },
  { value: "psoriasis", label: "Psoriasis" },
  { value: "scabies", label: "Scabies" },
  { value: "bullous_disease", label: "Bullous Disease (Blistering Disorder)" },
  { value: "melanoma", label: "Melanoma (Skin Cancer)" },
  { value: "basal_cell_carcinoma", label: "Basal Cell Carcinoma" },
  { value: "squamous_cell_carcinoma", label: "Squamous Cell Carcinoma" },
  { value: "melanocytic_nevus", label: "Mole (Melanocytic Nevus)" },
  { value: "benign_lesion", label: "Benign Skin Lesion" },
  { value: "pigmentary_disorder", label: "Pigmentation Disorder" },
  { value: "bacterial_infection", label: "Bacterial Skin Infection" },
  { value: "viral_infection", label: "Viral Skin Infection (Warts / Molluscum)" },
  { value: "other", label: "Other (Custom)" },
];

const SEVERITY_OPTIONS = ["Minimal", "Mild", "Moderate", "Severe", "Critical"];
const FEE_STATUS_OPTIONS = ["paid", "unpaid", "waived"] as const;
type FeeStatus = typeof FEE_STATUS_OPTIONS[number];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PatientDetail {
  id: string;
  name: string;
  patient_display_id: string | null;
  age: number | null;
  gender: string | null;
  fitzpatrick_type: number | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  blood_group: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  current_medications: string | null;
  medical_history: Record<string, unknown> | null;
  created_at: string;
}

interface Photo {
  id: string;
  photo_url: string;
  photo_type: string;
  body_location: string | null;
  created_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SCREENING_LABELS: Record<string, Record<string, string>> = {
  duration: { less_1w: "Less than 1 week", "1_4w": "1–4 weeks", "1_3m": "1–3 months", "3_6m": "3–6 months", "6m_plus": "More than 6 months", always: "Always had it" },
  presence: { constant: "Constant", comes_goes: "Comes and goes", worsening: "Getting worse", improving: "Improving" },
  itching: { none: "None", mild: "Mild", moderate: "Moderate", severe: "Severe", very_itchy: "Very itchy" },
  pain: { none: "No pain", mild: "Mild", moderate: "Moderate", severe: "Severe" },
  sweating: { never: "Never", sometimes: "Sometimes", often: "Often", always: "Always" },
  familyHistory: { none: "None" },
};

function getScreeningValue(medical_history: Record<string, unknown> | null, key: string): string {
  if (!medical_history) return "—";
  const sq = medical_history.screening_questions as Record<string, unknown> | undefined;
  const raw = (sq?.[key] as string) || "";
  if (!raw) return "—";
  return SCREENING_LABELS[key]?.[raw] ?? raw;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 mb-5"
      style={{ background: "#faf8f4", border: "1px solid #e8ddd0" }}
    >
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#9a8a76" }}>
          {title}
        </h2>
        <div className="flex-1 h-px" style={{ background: "rgba(184,147,106,0.25)" }} />
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReviewPatientPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const patientId = params.patient_id as string;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Form state
  const [diseaseClassification, setDiseaseClassification] = useState("");
  const [customClassification, setCustomClassification] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeStatus, setFeeStatus] = useState<FeeStatus>("unpaid");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // AI case data
  const [aiCase, setAiCase] = useState<{
    ai_diagnosis: string;
    ai_diagnosis_display: string;
    ai_confidence: number;
    ai_severity_label: string;
    ai_top_3: { class: string; confidence: number }[];
    source: string;
  } | null>(null);

  const fetchPatient = useCallback(async () => {
    if (!user || !patientId) return;
    setLoading(true);
    try {
      const { data: p } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .eq("linked_doctor_id", user.id)
        .single();

      if (!p) { router.push("/dashboard/ready-for-diagnosis"); return; }
      setPatient(p as PatientDetail);

      const { data: photoData } = await supabase
        .from("photos")
        .select("id, photo_url, photo_type, body_location, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true });

      const all = (photoData ?? []) as Photo[];
      setPhotos(all.filter((p) => p.photo_type === "skin_scan"));
      setMedicalRecords(all.filter((p) => p.photo_type === "medical_record"));

      // Fetch AI case if exists
      const { data: caseData } = await supabase
        .from("cases")
        .select("ai_diagnosis, ai_diagnosis_display, ai_confidence, ai_severity_label, ai_top_3, status")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (caseData && caseData.ai_diagnosis !== "pending") {
        setAiCase({
          ai_diagnosis: caseData.ai_diagnosis,
          ai_diagnosis_display: caseData.ai_diagnosis_display,
          ai_confidence: caseData.ai_confidence,
          ai_severity_label: caseData.ai_severity_label,
          ai_top_3: (caseData.ai_top_3 as { class: string; confidence: number }[]) ?? [],
          source: "ai",
        });
        // Pre-fill doctor's form from AI suggestion
        const aiDiag = caseData.ai_diagnosis as string;
        const matchOpt = DIAGNOSIS_OPTIONS.find((o) => o.value === aiDiag || o.value === aiDiag.replace(/\s/g, "_"));
        if (matchOpt) {
          setDiseaseClassification(matchOpt.value);
        }
        const sevMap: Record<string, string> = { Mild: "Mild", Moderate: "Moderate", Severe: "Severe", Critical: "Critical", Minimal: "Minimal" };
        if (sevMap[caseData.ai_severity_label]) {
          setSelectedSeverity(caseData.ai_severity_label);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, patientId, router]);

  useEffect(() => { fetchPatient(); }, [fetchPatient]);

  const handleConfirm = async () => {
    if (!patient || !user) return;
    if (!diseaseClassification) { setSubmitError("Please select a disease classification."); return; }
    if (!selectedSeverity) { setSubmitError("Please select a severity level."); return; }

    const classificationLabel = diseaseClassification === "other"
      ? customClassification.trim()
      : DIAGNOSIS_OPTIONS.find((d) => d.value === diseaseClassification)?.label ?? diseaseClassification;

    if (diseaseClassification === "other" && !customClassification.trim()) {
      setSubmitError("Please enter a custom classification name."); return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Update patient — current_diagnosis stores the classification
      await supabase.from("patients").update({
        treatment_status: "active",
        current_diagnosis: classificationLabel,
        diagnosis_date: new Date().toISOString().split("T")[0],
        severity: selectedSeverity.toLowerCase(),
      }).eq("id", patient.id);

      // 2. Check if case exists
      const { data: existingCase } = await supabase
        .from("cases")
        .select("id")
        .eq("patient_id", patient.id)
        .limit(1)
        .maybeSingle();

      const mh = patient.medical_history as Record<string, unknown> | null;
      const sq = (mh?.screening_questions ?? {}) as Record<string, unknown>;

      if (existingCase) {
        await supabase.from("cases").update({
          status: "confirmed",
          doctor_override_diagnosis: classificationLabel,
          doctor_override_notes: doctorNotes,
          doctor_reviewed_at: new Date().toISOString(),
        }).eq("id", existingCase.id);
      } else {
        await supabase.from("cases").insert({
          patient_id: patient.id,
          assigned_doctor_id: user.id,
          ai_diagnosis: "pending",
          ai_diagnosis_display: "Pending AI Integration",
          ai_confidence: 0,
          ai_severity: 0,
          ai_severity_label: "Pending",
          ai_top_3: [],
          body_location: getScreeningValue(patient.medical_history, "bodyLocation"),
          status: "confirmed",
          doctor_override_diagnosis: classificationLabel,
          doctor_override_notes: doctorNotes,
          doctor_reviewed_at: new Date().toISOString(),
          questionnaire_data: sq,
        });
      }

      // 3. Update most recent visit — diagnosis stores free-text
      const { data: visit } = await supabase
        .from("visits")
        .select("id")
        .eq("patient_id", patient.id)
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (visit) {
        await supabase.from("visits").update({
          diagnosis: diagnosisText.trim() || classificationLabel,
          severity: selectedSeverity.toLowerCase(),
          doctor_notes: doctorNotes,
          visit_fee: parseFloat(feeAmount) || 0,
        }).eq("id", visit.id);

        // 4. Insert fee record if amount > 0
        const amount = parseFloat(feeAmount) || 0;
        if (amount > 0 || feeStatus !== "unpaid") {
          await supabase.from("patient_fees").insert({
            patient_id: patient.id,
            doctor_id: user.id,
            visit_id: visit.id,
            amount,
            status: feeStatus,
            fee_type: "consultation",
          }).then(() => { /* ignore errors if table doesn't exist yet */ });
        }
      }

      router.push(`/dashboard/patients/${patient.id}`);
    } catch (err) {
      console.error("[review] confirm error:", err);
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded" style={{ background: "#e8ddd0" }} />
          <div className="h-48 rounded-2xl" style={{ background: "#e8ddd0" }} />
          <div className="h-48 rounded-2xl" style={{ background: "#e8ddd0" }} />
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const screeningFields = [
    { label: "Age", key: "age", value: patient.age ? String(patient.age) : null },
    { label: "Gender", key: "gender", value: patient.gender },
    { label: "Skin Tone", key: "fitzpatrick", value: patient.fitzpatrick_type ? `Fitzpatrick ${["I","II","III","IV","V","VI"][patient.fitzpatrick_type - 1] ?? patient.fitzpatrick_type}` : null },
    { label: "Body Location", key: "bodyLocation", value: getScreeningValue(patient.medical_history, "bodyLocation") },
    { label: "Duration", key: "duration", value: getScreeningValue(patient.medical_history, "duration") },
    { label: "Itching", key: "itching", value: getScreeningValue(patient.medical_history, "itching") },
    { label: "Pain", key: "pain", value: getScreeningValue(patient.medical_history, "pain") },
    { label: "Frequency", key: "presence", value: getScreeningValue(patient.medical_history, "presence") },
    { label: "Sweating", key: "sweating", value: getScreeningValue(patient.medical_history, "sweating") },
    { label: "Family History", key: "familyHistory", value: getScreeningValue(patient.medical_history, "familyHistory") },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard/ready-for-diagnosis"
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
          style={{ color: "#7a5c35" }}
        >
          <ArrowLeft size={16} />
          Back to Queue
        </Link>
        <Link
          href="/dashboard/ready-for-diagnosis"
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-red-500"
          style={{ color: "#9a8a76" }}
        >
          <X size={15} />
          Cancel Review
        </Link>
      </div>

      {/* Patient name banner */}
      <div className="rounded-2xl px-6 py-4 mb-5" style={{ background: "rgba(184,147,106,0.12)", border: "1px solid rgba(184,147,106,0.3)" }}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-serif font-bold" style={{ color: "#1a1612" }}>
            {patient.name}
          </h1>
          <span className="text-xs font-mono font-semibold px-2 py-1 rounded-lg" style={{ background: "#e8ddd0", color: "#7a5c35" }}>
            {patient.patient_display_id ?? "—"}
          </span>
        </div>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <SectionCard title="Photos">
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxUrl(photo.photo_url)}
                className="relative rounded-xl overflow-hidden transition-opacity hover:opacity-80"
                style={{ width: 120, height: 120 }}
              >
                <img src={photo.photo_url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* AI Screening Result */}
      {aiCase && (
        <SectionCard title="AI Screening Result">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#9a8a76" }}>AI Diagnosis</p>
              <p className="text-lg font-serif font-bold" style={{ color: ["melanoma", "basal_cell_carcinoma", "squamous_cell_carcinoma"].includes(aiCase.ai_diagnosis) ? "#dc2626" : "#1a1612" }}>
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
          {/* Confidence bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold" style={{ color: "#9a8a76" }}>Confidence</span>
              <span className="text-sm font-bold" style={{ color: Math.round(aiCase.ai_confidence * 100) >= 75 ? "#4a9a4a" : Math.round(aiCase.ai_confidence * 100) >= 50 ? "#d4a55a" : "#c44a4a" }}>
                {Math.round(aiCase.ai_confidence * 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full" style={{ background: "#e8e0d0" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(aiCase.ai_confidence * 100)}%`,
                  background: Math.round(aiCase.ai_confidence * 100) >= 75 ? "#4a9a4a" : Math.round(aiCase.ai_confidence * 100) >= 50 ? "#d4a55a" : "#c44a4a",
                }}
              />
            </div>
          </div>
          {/* Top 3 */}
          {aiCase.ai_top_3.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9a8a76" }}>Differential Diagnosis</p>
              <div className="space-y-2">
                {aiCase.ai_top_3.map((pred, idx) => {
                  const pct = Math.round(pred.confidence * 100);
                  const isCancer = ["melanoma", "basal_cell_carcinoma", "squamous_cell_carcinoma"].includes(pred.class);
                  const displayName: Record<string, string> = {
                    healthy: "Healthy Skin", acne: "Acne", fungal_infection: "Fungal Infection",
                    dermatitis: "Dermatitis / Eczema", psoriasis: "Psoriasis", melanoma: "Melanoma",
                    basal_cell_carcinoma: "Basal Cell Carcinoma", squamous_cell_carcinoma: "Squamous Cell Carcinoma",
                    melanocytic_nevus: "Mole (Melanocytic Nevus)", benign_lesion: "Benign Skin Lesion",
                    pigmentary_disorder: "Pigmentation Disorder", bacterial_infection: "Bacterial Infection",
                    viral_infection: "Viral Infection",
                  };
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-5 text-right" style={{ color: "#9a8a76" }}>{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium" style={{ color: isCancer ? "#dc2626" : "#1a1612" }}>
                            {displayName[pred.class] || pred.class}{isCancer ? " ⚠" : ""}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: "#9a8a76" }}>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: "#e8e0d0" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isCancer ? "#dc2626" : "#b8936a" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-xs mt-4 pt-3" style={{ color: "#9a8a76", borderTop: "1px solid rgba(184,147,106,0.2)" }}>
            AI suggestion has been pre-filled below. You can confirm or override the classification.
          </p>
        </SectionCard>
      )}

      {/* Screening data */}
      <SectionCard title="Screening Data">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          {screeningFields.map(({ label, value }) => (
            value && value !== "—" ? (
              <div key={label}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a8a76" }}>{label}</div>
                <div className="text-sm font-medium capitalize" style={{ color: "#1a1612" }}>{value}</div>
              </div>
            ) : null
          ))}
        </div>
      </SectionCard>

      {/* Patient details */}
      <SectionCard title="Patient Details">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          {[
            { label: "Phone", value: patient.phone },
            { label: "Email", value: patient.email },
            { label: "City", value: [patient.city, patient.state].filter(Boolean).join(", ") },
            { label: "Blood Group", value: patient.blood_group },
            { label: "Allergies", value: patient.allergies?.join(", ") },
            { label: "Chronic Conditions", value: patient.chronic_conditions?.join(", ") },
            { label: "Current Medications", value: patient.current_medications },
          ].map(({ label, value }) => (
            value ? (
              <div key={label}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: "#9a8a76" }}>{label}</div>
                <div className="text-sm font-medium" style={{ color: "#1a1612" }}>{value}</div>
              </div>
            ) : null
          ))}
        </div>
      </SectionCard>

      {/* Medical Records / Lab Reports */}
      {medicalRecords.length > 0 && (
        <SectionCard title="Medical Records / Lab Reports">
          <div className="flex flex-wrap gap-3">
            {medicalRecords.map((rec, idx) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => setLightboxUrl(rec.photo_url)}
                className="relative rounded-xl overflow-hidden transition-opacity hover:opacity-80"
                style={{ width: 120, height: 120 }}
              >
                <img src={rec.photo_url} alt={`Record ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Fees */}
      <SectionCard title="Fees">
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{ color: "#9a8a76" }}>
              Consultation Fee
            </label>
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid #e8ddd0", background: "#fff" }}>
              <span className="px-3 py-2 text-sm font-medium border-r" style={{ color: "#9a8a76", borderColor: "#e8ddd0" }}>₹</span>
              <input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                className="px-3 py-2 text-sm outline-none w-32"
                style={{ color: "#1a1612", background: "transparent" }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: "#9a8a76" }}>
              Fee Status
            </label>
            <div className="flex gap-2">
              {FEE_STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFeeStatus(status)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                  style={feeStatus === status
                    ? { background: "#b8936a", color: "#fff" }
                    : { background: "#e8ddd0", color: "#7a5c35" }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Disease Classification & Diagnosis */}
      <SectionCard title="Doctor's Assessment">
        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: "#9a8a76" }}>
            AI Predicted Classification <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            value={diseaseClassification}
            onChange={(e) => setDiseaseClassification(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none appearance-none"
            style={{ border: "1px solid #e8ddd0", background: "#fff", color: "#1a1612" }}
          >
            <option value="">— Select a classification —</option>
            {DIAGNOSIS_OPTIONS.slice(0, -1).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            <option disabled>──────────────</option>
            <option value="other">Other (Custom)</option>
          </select>
        </div>

        {diseaseClassification === "other" && (
          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: "#9a8a76" }}>
              Custom Classification <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter classification name..."
              value={customClassification}
              onChange={(e) => setCustomClassification(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #e8ddd0", background: "#fff", color: "#1a1612" }}
            />
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: "#9a8a76" }}>
            Diagnosis
          </label>
          <input
            type="text"
            placeholder="Write your detailed diagnosis..."
            value={diagnosisText}
            onChange={(e) => setDiagnosisText(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: "1px solid #e8ddd0", background: "#fff", color: "#1a1612" }}
          />
          <p className="text-xs mt-1" style={{ color: "#9a8a76" }}>Optional. If left empty, the classification label will be used.</p>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: "#9a8a76" }}>
            Severity <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={selectedSeverity === sev
                  ? { background: "#b8936a", color: "#fff" }
                  : { background: "#e8ddd0", color: "#7a5c35" }}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: "#9a8a76" }}>
            Doctor&apos;s Notes
          </label>
          <textarea
            rows={3}
            placeholder="Optional notes about diagnosis, treatment plan, or observations..."
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none resize-none"
            style={{ border: "1px solid #e8ddd0", background: "#fff", color: "#1a1612" }}
          />
        </div>
      </SectionCard>

      {/* Error */}
      {submitError && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          {submitError}
        </div>
      )}

      {/* Confirm button */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full py-3.5 rounded-xl text-base font-semibold text-white transition-opacity mb-8"
        style={{ background: "#b8936a", opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
      >
        {submitting ? "Saving..." : "Confirm & Add to Patients"}
      </button>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
          >
            <X size={18} />
          </button>
          <img
            src={lightboxUrl}
            alt="Photo"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
