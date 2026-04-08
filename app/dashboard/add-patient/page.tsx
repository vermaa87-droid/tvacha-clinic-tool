"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { compressImage } from "@/lib/image-utils";
import { AddPatientStepper } from "./components/AddPatientStepper";
import { Step1Photos } from "./components/Step1Photos";
import { Step2Screening } from "./components/Step2Screening";
import { Step3Details } from "./components/Step3Details";
import { Step4AI } from "./components/Step4AI";
import { Step5Summary } from "./components/Step5Summary";
import {
  INITIAL_SCREENING,
  INITIAL_FORM,
  type ScreeningData,
  type PatientFormData,
  type SavedPatient,
} from "./wizard-types";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type WizardStep = 1 | 2 | 3 | 4 | 5;

const WIZARD_KEY = "tvacha_add_patient_wizard";
const WIZARD_PHOTOS_KEY = "tvacha_add_patient_wizard_photos";
const WIZARD_RECORDS_KEY = "tvacha_add_patient_wizard_records";

// ── sessionStorage helpers ───────────────────────────────────────────────────

function readWizardStorage(): Record<string, unknown> | null {
  try {
    const saved = sessionStorage.getItem(WIZARD_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function clearWizardStorage() {
  try {
    sessionStorage.removeItem(WIZARD_KEY);
    sessionStorage.removeItem(WIZARD_PHOTOS_KEY);
    sessionStorage.removeItem(WIZARD_RECORDS_KEY);
  } catch { /* ignore */ }
}

// ── Photo helpers ────────────────────────────────────────────────────────────

function resetPreviews(slots: (string | null)[]) {
  slots.forEach((url) => { if (url) URL.revokeObjectURL(url); });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

async function base64ToFile(dataUrl: string, index: number): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], `restored_photo_${index + 1}.jpg`, { type: "image/jpeg" });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AddPatientPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useLanguage();

  // ── State — lazily initialised from sessionStorage so first render is correct

  const [currentStep, setCurrentStep] = useState<WizardStep>(() => {
    const s = readWizardStorage();
    return ((s?.currentStep as WizardStep) ?? 1);
  });

  const [screeningData, setScreeningData] = useState<ScreeningData>(() => {
    const s = readWizardStorage();
    return (s?.screeningData as ScreeningData) ?? INITIAL_SCREENING;
  });

  const [formData, setFormData] = useState<PatientFormData>(() => {
    const s = readWizardStorage();
    if (s?.formData) {
      return { ...INITIAL_FORM, ...(s.formData as PatientFormData), medicalRecords: [] };
    }
    return INITIAL_FORM;
  });

  const [savedPatient, setSavedPatient] = useState<SavedPatient | null>(() => {
    const s = readWizardStorage();
    return (s?.savedPatient as SavedPatient) ?? null;
  });

  // Step 1 photos (can't be serialised synchronously — restored async below)
  const [photoSlots, setPhotoSlots] = useState<(File | null)[]>([null, null, null]);
  const [previewSlots, setPreviewSlots] = useState<(string | null)[]>([null, null, null]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Prevent saving while async restore is still running
  const photoRestoringRef = useRef(true);
  const recordsRestoringRef = useRef(true);

  // ── Restore photos from sessionStorage (async, runs once on mount) ─────────

  useEffect(() => {
    const savedPhotos = sessionStorage.getItem(WIZARD_PHOTOS_KEY);
    if (!savedPhotos) {
      photoRestoringRef.current = false;
    } else {
      try {
        const dataUrls: (string | null)[] = JSON.parse(savedPhotos);
        Promise.all(
          dataUrls.map((url, i) => (url ? base64ToFile(url, i) : Promise.resolve(null)))
        ).then((files) => {
          const previews = files.map((f) => (f ? URL.createObjectURL(f) : null));
          setPhotoSlots(files);
          setPreviewSlots(previews);
          photoRestoringRef.current = false;
        }).catch(() => {
          photoRestoringRef.current = false;
        });
      } catch {
        photoRestoringRef.current = false;
      }
    }

    // ── Restore medical records from sessionStorage ──────────────────────────
    const savedRecords = sessionStorage.getItem(WIZARD_RECORDS_KEY);
    if (!savedRecords) {
      recordsRestoringRef.current = false;
    } else {
      try {
        const entries: { dataUrl: string; name: string; type: string }[] = JSON.parse(savedRecords);
        Promise.all(
          entries.map(async ({ dataUrl, name, type }) => {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            return new File([blob], name, { type });
          })
        ).then((files) => {
          setFormData((prev) => ({ ...prev, medicalRecords: files }));
          recordsRestoringRef.current = false;
        }).catch(() => {
          recordsRestoringRef.current = false;
        });
      } catch {
        recordsRestoringRef.current = false;
      }
    }
  }, []);

  // ── Persist main wizard state whenever it changes ─────────────────────────

  useEffect(() => {
    if (currentStep === 5) return; // cleared separately on step 5
    try {
      sessionStorage.setItem(WIZARD_KEY, JSON.stringify({
        currentStep,
        screeningData,
        formData: { ...formData, medicalRecords: [] },
        savedPatient,
      }));
    } catch { /* quota exceeded */ }
  }, [currentStep, screeningData, formData, savedPatient]);

  // ── Persist photos (as base64) whenever slots change ──────────────────────

  useEffect(() => {
    if (photoRestoringRef.current) return;
    Promise.all(
      photoSlots.map((f) => (f ? fileToBase64(f) : Promise.resolve(null)))
    ).then((base64s) => {
      try {
        sessionStorage.setItem(WIZARD_PHOTOS_KEY, JSON.stringify(base64s));
      } catch { /* quota exceeded */ }
    });
  }, [photoSlots]);

  // ── Persist medical records (as base64) whenever they change ──────────────

  useEffect(() => {
    if (recordsRestoringRef.current) return;
    const records = formData.medicalRecords;
    if (records.length === 0) {
      try { sessionStorage.removeItem(WIZARD_RECORDS_KEY); } catch { /* ignore */ }
      return;
    }
    Promise.all(
      records.map(async (f) => ({
        dataUrl: await fileToBase64(f),
        name: f.name,
        type: f.type,
      }))
    ).then((entries) => {
      try {
        sessionStorage.setItem(WIZARD_RECORDS_KEY, JSON.stringify(entries));
      } catch { /* quota exceeded — skip */ }
    });
  }, [formData.medicalRecords]);

  // Clear sessionStorage when wizard reaches the final summary step
  useEffect(() => {
    if (currentStep === 5) clearWizardStorage();
  }, [currentStep]);

  // ── Photo slot handlers ───────────────────────────────────────────────────

  const handleSetSlot = useCallback((index: number, file: File, preview: string) => {
    setPhotoSlots((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
    setPreviewSlots((prev) => {
      const next = [...prev];
      if (prev[index]) URL.revokeObjectURL(prev[index]!);
      next[index] = preview;
      return next;
    });
  }, []);

  const handleClearSlot = useCallback((index: number) => {
    setPhotoSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setPreviewSlots((prev) => {
      const next = [...prev];
      if (prev[index]) URL.revokeObjectURL(prev[index]!);
      next[index] = null;
      return next;
    });
  }, []);

  // ── Supabase save (Step 3 → Step 4) ───────────────────────────────────────

  const savePatient = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    try {
      // 1. Generate patient_display_id
      const { data: existing } = await supabase
        .from("patients")
        .select("patient_display_id")
        .eq("linked_doctor_id", user.id)
        .like("patient_display_id", "NDN-%")
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastId = (existing[0] as { patient_display_id: string }).patient_display_id;
        const match = lastId?.match(/NDN-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const patientDisplayId = `NDN-${String(nextNum).padStart(4, "0")}`;

      // 2. Insert patient row
      const { data: newPatient, error: patientError } = await supabase
        .from("patients")
        .insert({
          name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          age: parseInt(screeningData.age, 10),
          gender: screeningData.gender,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state || null,
          blood_group: formData.bloodGroup || null,
          fitzpatrick_type: screeningData.fitzpatrick,
          allergies: formData.allergies.length > 0 ? formData.allergies : null,
          chronic_conditions: formData.chronicConditions.length > 0 ? formData.chronicConditions : null,
          current_medications: formData.currentMedications.trim() || null,
          chief_complaint: screeningData.bodyLocation,
          medical_history: {
            screening_questions: screeningData,
            recorded_at: new Date().toISOString(),
          },
          linked_doctor_id: user.id,
          patient_display_id: patientDisplayId,
          treatment_status: "pending_diagnosis",
          total_visits: 1,
          last_visit_date: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (patientError) throw new Error(patientError.message);
      if (!newPatient) throw new Error("No patient returned from insert");

      const patientId = (newPatient as { id: string }).id;

      // 3. Compress photos client-side, then upload via server API route
      //    (server uses admin client, bypassing any storage RLS policies)
      const filledSlots = photoSlots.filter((f): f is File => f !== null);
      const compressedPhotos: File[] = [];
      for (const file of filledSlots) {
        try {
          compressedPhotos.push(await compressImage(file, 1200, 0.8));
        } catch {
          compressedPhotos.push(file); // fall back to original if compression fails
        }
      }

      const mediaFormData = new FormData();
      mediaFormData.append("patient_id", patientId);
      mediaFormData.append("doctor_id", user.id);
      mediaFormData.append("body_location", screeningData.bodyLocation);
      for (const photo of compressedPhotos) {
        mediaFormData.append("photos", photo);
      }
      for (const record of formData.medicalRecords) {
        mediaFormData.append("records", record);
      }

      const mediaRes = await fetch("/api/save-patient-media", {
        method: "POST",
        body: mediaFormData,
      });
      const mediaData = await mediaRes.json();

      if (!mediaRes.ok && mediaData.error && !mediaData.photoCount && !mediaData.recordCount) {
        // Only throw if nothing at all was saved (total failure)
        throw new Error(mediaData.error);
      }

      const photoCount: number = mediaData.photoCount ?? 0;
      const savedRecordCount: number = mediaData.recordCount ?? 0;
      const failedPhotos: number = mediaData.failedPhotos ?? (filledSlots.length - photoCount);
      const photoUrls: string[] = mediaData.photoUrls ?? [];

      // 4. Insert visit row
      await supabase.from("visits").insert({
        doctor_id: user.id,
        patient_id: patientId,
        visit_date: new Date().toISOString().split("T")[0],
        chief_complaint: `New patient intake — ${screeningData.bodyLocation}`,
        body_location: screeningData.bodyLocation,
        doctor_notes:
          "Patient registered via Add Patient wizard. Screening questions completed. Awaiting doctor review.",
      });

      setSavedPatient({
        id: patientId,
        name: formData.fullName.trim(),
        patient_display_id: patientDisplayId,
        phone: formData.phone.trim(),
        photoCount: photoCount,
        recordCount: savedRecordCount,
        photoUploadFailed: failedPhotos,
        photoUrls,
      });

      setCurrentStep(4);
    } catch (err) {
      console.error("[add-patient] save error:", err);
      setSaveError(
        err instanceof Error ? err.message : "Something went wrong while saving. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }, [user, formData, screeningData, photoSlots]);

  // ── Reset wizard ───────────────────────────────────────────────────────────

  const resetWizard = useCallback(() => {
    resetPreviews(previewSlots);
    clearWizardStorage();
    setCurrentStep(1);
    setPhotoSlots([null, null, null]);
    setPreviewSlots([null, null, null]);
    setScreeningData(INITIAL_SCREENING);
    setFormData(INITIAL_FORM);
    setSavedPatient(null);
    setSaveError(null);
  }, [previewSlots]);

  // ── Cancel ────────────────────────────────────────────────────────────────

  const handleCancelConfirm = useCallback(() => {
    clearWizardStorage();
    resetPreviews(previewSlots);
    router.push("/dashboard");
  }, [previewSlots, router]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-0 py-4 md:py-6">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t("ap_title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {t("ap_subtitle")}
        </p>
      </div>

      {/* Progress stepper */}
      <AddPatientStepper currentStep={currentStep} />

      {/* Step content card */}
      <div
        className="relative rounded-2xl p-6 md:p-8"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-primary-200)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        {/* Cancel button — visible on steps 1–4 */}
        {currentStep < 5 && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors hover:text-red-500 hover:bg-red-50"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <X size={15} />
            {t("ap_cancel")}
          </button>
        )}

        {currentStep === 1 && (
          <Step1Photos
            photoSlots={photoSlots}
            previewSlots={previewSlots}
            onSetSlot={handleSetSlot}
            onClearSlot={handleClearSlot}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2Screening
            data={screeningData}
            onChange={setScreeningData}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step3Details
            data={formData}
            onChange={setFormData}
            saveError={saveError}
            saving={saving}
            onBack={() => setCurrentStep(2)}
            onSave={savePatient}
          />
        )}

        {currentStep === 4 && savedPatient && (
          <Step4AI
            photos={photoSlots}
            previews={previewSlots}
            screeningData={screeningData}
            savedPatient={savedPatient}
            onContinue={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 5 && savedPatient && (
          <Step5Summary
            savedPatient={savedPatient}
            onAddAnother={resetWizard}
          />
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--color-card)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-serif font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t("ap_cancel_title")}
            </h3>
            {savedPatient ? (
              <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                {t("ap_cancel_saved")}
              </p>
            ) : (
              <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                {t("ap_cancel_unsaved")}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-5 py-2.5 rounded-lg font-semibold border text-sm"
                style={{ borderColor: "var(--color-primary-200)", color: "var(--color-text-secondary)", background: "transparent" }}
              >
                {t("ap_cancel_go_back")}
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="px-5 py-2.5 rounded-lg font-semibold text-white text-sm"
                style={{ background: "#c44a4a" }}
              >
                {t("ap_cancel_yes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
