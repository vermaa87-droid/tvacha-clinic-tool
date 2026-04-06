"use client";

import { useEffect, useCallback } from "react";
import { Camera, ClipboardList, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { ScreeningData, SavedPatient } from "../wizard-types";

interface Step4AIProps {
  photos: (File | null)[];
  previews: (string | null)[];
  screeningData: ScreeningData;
  savedPatient: SavedPatient;
  onContinue: () => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Step4AI({ previews, screeningData, savedPatient, onContinue }: Step4AIProps) {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const filledPreviews = previews.filter((p): p is string => p !== null);

  // Save a pending case record so the patient appears in the Ready-for-Diagnosis queue
  const savePendingCase = useCallback(async () => {
    if (!user) return;
    const casePayload = {
      patient_id: savedPatient.id,
      assigned_doctor_id: user.id,
      ai_diagnosis: "pending",
      ai_diagnosis_display: "Pending Doctor Review",
      ai_confidence: 0,
      ai_severity: 0,
      ai_severity_label: "Pending",
      ai_top_3: [],
      body_location: screeningData.bodyLocation || null,
      questionnaire_data: { screening_questions: screeningData, recorded_at: new Date().toISOString() },
      status: "pending_review",
    };
    const { data: existingCase } = await supabase
      .from("cases").select("id").eq("patient_id", savedPatient.id).maybeSingle();
    if (existingCase?.id) {
      await supabase.from("cases").update(casePayload).eq("id", existingCase.id);
    } else {
      await supabase.from("cases").insert(casePayload);
    }
  }, [user, savedPatient, screeningData]);

  useEffect(() => { savePendingCase(); }, [savePendingCase]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onContinue(); }}>
      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "#1a1612" }}>
        {t("ap_s4_title")}
      </h2>
      <p className="text-sm mb-8" style={{ color: "#9a8a76" }}>
        {t("ap_s4_subtitle")}
      </p>

      {/* Maintenance notice */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: "#fef9f0", border: "1px solid #f0e0c0" }}>
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}>
            <AlertTriangle size={20} style={{ color: "#d97706" }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: "#92400e" }}>Our AI faced some technical difficulties</p>
            <p className="text-sm mt-1" style={{ color: "#9a8a76" }}>
              It will be back by tomorrow. The patient data has been saved and will appear in the Ready for Diagnosis queue for manual review.
            </p>
          </div>
        </div>

        {/* Data summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#1a1612" }}>
            <Camera size={15} style={{ color: "#b8936a" }} />
            <span><strong>{savedPatient.photoCount}</strong> {t("ap_s4_photos_saved")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#1a1612" }}>
            <ClipboardList size={15} style={{ color: "#b8936a" }} />
            <span>{t("ap_s4_screening_saved")} — {screeningData.bodyLocation}</span>
          </div>
        </div>

        {filledPreviews.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "#9a8a76" }}>{t("ap_s4_captured")}</p>
            <div className="flex gap-2 flex-wrap">
              {filledPreviews.map((src, idx) => (
                <img key={idx} src={src} alt={`Photo ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" style={{ border: "1px solid #e8e0d0" }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {savedPatient.photoUploadFailed > 0 && (
        <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: "#fffbeb", border: "1px solid #fbbf24", color: "#92400e" }}>
          {t("ap_s4_upload_fail").replace("{count}", String(savedPatient.photoUploadFailed))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-3 rounded-lg font-semibold text-white min-h-[44px] transition-opacity"
          style={{ background: "#b8936a" }}
        >
          {t("ap_s4_continue")}
        </button>
      </div>
    </form>
  );
}
