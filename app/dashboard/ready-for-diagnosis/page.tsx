"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Stethoscope, Clock, Image as ImageIcon, CheckCircle2, SkipForward, Trash2 } from "lucide-react";

interface PendingPatient {
  id: string;
  name: string;
  patient_display_id: string | null;
  age: number | null;
  gender: string | null;
  fitzpatrick_type: number | null;
  medical_history: Record<string, unknown> | null;
  created_at: string;
  photo_count?: number;
  photo_urls?: string[];
  ai_diagnosis?: string | null;
  ai_diagnosis_display?: string | null;
}

function getWaitLabel(createdAt: string): { label: string; color: string } {
  const diff = (Date.now() - new Date(createdAt).getTime()) / 60000; // minutes
  if (diff < 60) return { label: `Waiting ${Math.round(diff)} min`, color: "#b8936a" };
  if (diff < 180) return { label: `Waiting ${Math.round(diff / 60)} hr`, color: "#d97706" };
  return { label: `Waiting ${Math.round(diff / 60)} hr`, color: "#dc2626" };
}

const SCREENING_LABELS: Record<string, Record<string, string>> = {
  duration: { less_1w: "Less than 1 week", "1_4w": "1–4 weeks", "1_3m": "1–3 months", "3_6m": "3–6 months", "6m_plus": "More than 6 months", always: "Always had it" },
  itching: { none: "None", mild: "Mild", moderate: "Moderate", severe: "Severe", very_itchy: "Very itchy" },
};

function getScreeningValue(medical_history: Record<string, unknown> | null, key: string): string {
  if (!medical_history) return "—";
  const sq = medical_history.screening_questions as Record<string, unknown> | undefined;
  if (!sq) return "—";
  const raw = (sq[key] as string) || "";
  if (!raw) return "—";
  return SCREENING_LABELS[key]?.[raw] ?? raw;
}

export default function ReadyForDiagnosisPage() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<PendingPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissId, setDismissId] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, name, patient_display_id, age, gender, fitzpatrick_type, medical_history, created_at")
        .eq("linked_doctor_id", user.id)
        .eq("treatment_status", "pending_diagnosis")
        .order("created_at", { ascending: true });

      if (!patientData) { setPatients([]); return; }

      const patientIds = patientData.map((p) => p.id);

      // Fetch photo counts and AI cases in parallel
      const [patientsWithPhotos, casesData] = await Promise.all([
        Promise.all(
          patientData.map(async (p) => {
            const { data: photos } = await supabase
              .from("photos")
              .select("photo_url")
              .eq("patient_id", p.id)
              .eq("photo_type", "skin_scan")
              .order("created_at", { ascending: true })
              .limit(3);
            return {
              ...p,
              photo_count: photos?.length ?? 0,
              photo_urls: photos?.map((ph) => ph.photo_url as string) ?? [],
            };
          })
        ),
        supabase
          .from("cases")
          .select("patient_id, ai_diagnosis, ai_diagnosis_display")
          .in("patient_id", patientIds)
          .order("created_at", { ascending: false })
          .then(({ data }) => data ?? []),
      ]);

      // Build patient_id → latest case map
      const caseMap = new Map<string, { ai_diagnosis: string; ai_diagnosis_display: string }>();
      for (const c of casesData) {
        if (!caseMap.has(c.patient_id)) {
          caseMap.set(c.patient_id, { ai_diagnosis: c.ai_diagnosis, ai_diagnosis_display: c.ai_diagnosis_display });
        }
      }

      const merged = patientsWithPhotos.map((p) => ({
        ...p,
        ai_diagnosis: caseMap.get(p.id)?.ai_diagnosis ?? null,
        ai_diagnosis_display: caseMap.get(p.id)?.ai_diagnosis_display ?? null,
      }));

      setPatients(merged as PendingPatient[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("rfd-patients")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `linked_doctor_id=eq.${user.id}` }, fetchPatients)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPatients]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold" style={{ color: "#1a1612" }}>
          Ready for Diagnosis
        </h1>
        <p className="text-sm mt-1" style={{ color: "#9a8a76" }}>
          These patients have been pre-screened and are waiting for your review.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: "#faf8f4", border: "1px solid #e8ddd0" }}>
              <div className="h-5 w-48 rounded mb-3" style={{ background: "#e8ddd0" }} />
              <div className="h-4 w-64 rounded mb-2" style={{ background: "#e8ddd0" }} />
              <div className="h-4 w-40 rounded" style={{ background: "#e8ddd0" }} />
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: "rgba(184,147,106,0.12)" }}
          >
            <CheckCircle2 size={40} style={{ color: "#b8936a" }} />
          </div>
          <h2 className="text-xl font-serif font-bold mb-2" style={{ color: "#1a1612" }}>
            All caught up!
          </h2>
          <p className="text-sm" style={{ color: "#9a8a76" }}>
            No patients waiting for diagnosis.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {patients.map((patient) => {
            const wait = getWaitLabel(patient.created_at);
            const bodyLocation = getScreeningValue(patient.medical_history, "bodyLocation");
            const duration = getScreeningValue(patient.medical_history, "duration");
            const itching = getScreeningValue(patient.medical_history, "itching");
            const fitzLabel = patient.fitzpatrick_type ? `Fitzpatrick ${["I","II","III","IV","V","VI"][patient.fitzpatrick_type - 1] ?? patient.fitzpatrick_type}` : null;

            return (
              <div
                key={patient.id}
                className="rounded-2xl p-6"
                style={{
                  background: "#faf8f4",
                  border: "1px solid #e8ddd0",
                  boxShadow: "0 2px 8px rgba(90,60,20,0.06)",
                }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-serif font-bold" style={{ color: "#1a1612" }}>
                      {patient.name}
                    </h2>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm" style={{ color: "#9a8a76" }}>
                      {patient.age && <span>Age: {patient.age}</span>}
                      {patient.gender && <span>· {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</span>}
                      {fitzLabel && <span>· {fitzLabel}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-1 rounded-lg" style={{ background: "#e8ddd0", color: "#7a5c35" }}>
                    {patient.patient_display_id ?? "—"}
                  </span>
                </div>

                {/* Screening info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-sm" style={{ color: "#6b5040" }}>
                  {bodyLocation !== "—" && <span>Body Location: <strong>{bodyLocation}</strong></span>}
                  {duration !== "—" && <span>· Duration: <strong>{duration}</strong></span>}
                  {itching !== "—" && <span>· Itching: <strong>{itching}</strong></span>}
                </div>

                {/* Status row */}
                <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
                  <span className="flex items-center gap-1.5" style={{ color: "#9a8a76" }}>
                    <ImageIcon size={13} />
                    {patient.photo_count} photo{patient.photo_count !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "#3d6b5e" }}>
                    <CheckCircle2 size={13} />
                    Screening complete
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: wait.color }}>
                    <Clock size={13} />
                    {wait.label}
                  </span>
                </div>

                {/* Photo thumbnails */}
                {(patient.photo_urls?.length ?? 0) > 0 && (
                  <div className="flex gap-2 mb-4">
                    {patient.photo_urls!.slice(0, 3).map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                          style={{ border: "1px solid #e8ddd0" }}
                        />
                      </a>
                    ))}
                  </div>
                )}


                {/* AI classification badge */}
                {patient.ai_diagnosis && patient.ai_diagnosis !== "pending" && patient.ai_diagnosis_display && (
                  <div className="mb-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                      style={{ background: "rgba(184,147,106,0.15)", color: "#7a5c35", border: "1px solid rgba(184,147,106,0.35)" }}
                    >
                      AI classified it as:{" "}
                      <span style={{ color: "#1a1612" }}>{patient.ai_diagnosis_display.toUpperCase()}</span>
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/dashboard/ready-for-diagnosis/${patient.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ background: "#b8936a" }}
                  >
                    <Stethoscope size={15} />
                    Review Patient →
                  </Link>
                  <button
                    onClick={() => setDismissId(patient.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: "rgba(184,147,106,0.1)",
                      color: "#7a5c35",
                      border: "1px solid rgba(184,147,106,0.25)",
                    }}
                  >
                    <SkipForward size={15} />
                    Skip
                  </button>
                  <button
                    onClick={() => setDeleteId(patient.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: "rgba(220,38,38,0.08)",
                      color: "#b91c1c",
                      border: "1px solid rgba(220,38,38,0.2)",
                    }}
                  >
                    <Trash2 size={15} />
                    Delete Patient
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skip confirmation modal */}
      {dismissId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div
            className="w-full max-w-sm mx-4 rounded-2xl p-6"
            style={{
              background: "#faf8f4",
              border: "1px solid #e8ddd0",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex justify-center mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(184,147,106,0.12)" }}
              >
                <SkipForward size={24} style={{ color: "#7a5c35" }} />
              </div>
            </div>
            <h3 className="text-lg font-serif font-bold text-center mb-2" style={{ color: "#1a1612" }}>
              Skip this patient?
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: "#9a8a76" }}>
              This patient will be moved out of the diagnosis queue. You can still find them in the Patients section.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDismissId(null)}
                disabled={dismissing}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "rgba(184,147,106,0.12)",
                  color: "#7a5c35",
                  border: "1px solid rgba(184,147,106,0.25)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDismissing(true);
                  await supabase
                    .from("patients")
                    .update({ treatment_status: "active" })
                    .eq("id", dismissId);
                  setDismissing(false);
                  setDismissId(null);
                  fetchPatients();
                }}
                disabled={dismissing}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: "#7a5c35" }}
              >
                {dismissing ? "Skipping…" : "Yes, skip"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div
            className="w-full max-w-sm mx-4 rounded-2xl p-6"
            style={{
              background: "#faf8f4",
              border: "1px solid #e8ddd0",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex justify-center mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(220,38,38,0.1)" }}
              >
                <Trash2 size={24} style={{ color: "#dc2626" }} />
              </div>
            </div>
            <h3 className="text-lg font-serif font-bold text-center mb-2" style={{ color: "#1a1612" }}>
              Delete this patient?
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: "#9a8a76" }}>
              This will permanently delete the patient and all their data including photos, visits, and prescriptions. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "rgba(184,147,106,0.12)",
                  color: "#7a5c35",
                  border: "1px solid rgba(184,147,106,0.25)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  const res = await fetch("/api/delete-patient", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ patientId: deleteId, doctorId: user?.id }),
                  });
                  if (!res.ok) console.error("[delete-patient]", await res.text());
                  setDeleting(false);
                  setDeleteId(null);
                  fetchPatients();
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: "#dc2626" }}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
