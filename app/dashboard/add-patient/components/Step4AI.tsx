"use client";

import { useEffect, useState, useCallback } from "react";
import { Brain, Camera, ClipboardList, AlertTriangle, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  CLASS_DISPLAY_NAMES,
  CANCER_CLASSES,
  CLASS_WARNINGS,
  URGENT_REFERRAL_TRIGGERS,
  type ClassWarning,
} from "@/lib/constants";
import type { ScreeningData, SavedPatient, AIResult } from "../wizard-types";

interface Step4AIProps {
  photos: (File | null)[];
  previews: (string | null)[];
  screeningData: ScreeningData;
  savedPatient: SavedPatient;
  onContinue: () => void;
}

// ── Urgent referral check ─────────────────────────────────────────────────────

function checkUrgentReferral(sd: ScreeningData): { isUrgent: boolean; triggerName?: string; message?: string } {
  for (const trigger of URGENT_REFERRAL_TRIGGERS) {
    let allMet = true;
    for (const [key, expected] of Object.entries(trigger.conditions)) {
      const actual = (sd as unknown as Record<string, string>)[key] ?? "";
      if (Array.isArray(expected)) {
        if (!expected.includes(actual)) { allMet = false; break; }
      } else {
        if (actual !== expected) { allMet = false; break; }
      }
    }
    if (allMet) return { isUrgent: true, triggerName: trigger.name, message: trigger.message };
  }
  return { isUrgent: false };
}

// ── Mock AI for when FastAPI is not running ────────────────────────────────────


// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? "#4a9a4a" : pct >= 50 ? "#d4a55a" : "#c44a4a";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>Confidence</span>
        <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-2.5 rounded-full" style={{ background: "var(--color-primary-200)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SeverityBadge({ label }: { label: string }) {
  const m: Record<string, { bg: string; text: string }> = {
    Mild: { bg: "rgba(74,154,74,0.12)", text: "#4a9a4a" },
    Moderate: { bg: "rgba(212,165,90,0.15)", text: "#b8860b" },
    Severe: { bg: "rgba(220,38,38,0.1)", text: "#dc2626" },
    Critical: { bg: "rgba(127,29,29,0.12)", text: "#7f1d1d" },
    Pending: { bg: "rgba(184,147,106,0.12)", text: "var(--color-text-secondary)" },
  };
  const s = m[label] ?? m.Pending;
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.text }}>
      {label}
    </span>
  );
}

function ClassWarningBanner({ warning }: { warning: ClassWarning }) {
  const isRed = warning.color === "red";
  return (
    <div
      className="flex items-start gap-3 rounded-xl p-4 mb-5"
      style={{
        background: isRed ? "rgba(220,38,38,0.06)" : "rgba(245,158,11,0.08)",
        border: `1px solid ${isRed ? "rgba(220,38,38,0.2)" : "rgba(245,158,11,0.3)"}`,
      }}
    >
      <ShieldAlert size={20} style={{ color: isRed ? "#dc2626" : "#d97706", flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="text-sm font-bold" style={{ color: isRed ? "#dc2626" : "#92400e" }}>{warning.title}</p>
        <p className="text-xs mt-1" style={{ color: isRed ? "#7f1d1d" : "#78350f" }}>{warning.message}</p>
        {warning.treatment_hint && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-text-secondary)" }}>Typical treatment: {warning.treatment_hint}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Step4AI({ previews, screeningData, savedPatient, onContinue }: Step4AIProps) {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const filledPreviews = previews.filter((p): p is string => p !== null);

  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState("Analyzing skin images...");

  // Rotating loading text
  useEffect(() => {
    if (!loading) return;
    const t1 = setTimeout(() => setLoadingText("Processing with AI model..."), 2000);
    const t2 = setTimeout(() => setLoadingText("Generating diagnosis..."), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading]);

  const runDiagnosis = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const urgentCheck = checkUrgentReferral(screeningData);

    try {
      let result: AIResult;

      try {
        const res = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: savedPatient.id,
            doctorId: user.id,
            photoUrls: savedPatient.photoUrls,
            screeningData,
          }),
        });
        const data = await res.json();

        if (!res.ok || data.source === "pending") {
          throw new Error("AI service unavailable");
        }
        result = {
          source: data.source,
          diagnosis: data.diagnosis,
          diagnosis_display: data.diagnosis_display,
          confidence: data.confidence,
          severity: data.severity,
          severity_label: data.severity_label,
          top_3: data.top_3 ?? [],
          category: data.category,
          api_warnings: data.api_warnings ?? [],
        };
      } catch {
        setLoading(false);
        setError("Our AI is currently experiencing technical difficulties. Please try again in a few minutes. If the issue persists, contact support.");
        return;
      }

      if (urgentCheck.isUrgent) {
        result.urgent = urgentCheck;
      }

      setAiResult(result);

      const casePayload = {
        patient_id: savedPatient.id,
        assigned_doctor_id: user.id,
        ai_diagnosis: result.diagnosis,
        ai_diagnosis_display: result.diagnosis_display,
        ai_confidence: result.confidence,
        ai_severity: result.severity,
        ai_severity_label: result.severity_label,
        ai_top_3: result.top_3,
        body_location: screeningData.bodyLocation || null,
        questionnaire_data: { screening_questions: screeningData, recorded_at: new Date().toISOString() },
        status: urgentCheck.isUrgent ? "flagged" : "pending_review",
      };

      const { data: existingCase } = await supabase
        .from("cases")
        .select("id")
        .eq("patient_id", savedPatient.id)
        .maybeSingle();

      if (existingCase?.id) {
        const { error: updErr } = await supabase.from("cases").update(casePayload).eq("id", existingCase.id);
        if (updErr) console.error("[Step4AI] case update failed:", updErr.message);
      } else {
        const { error: insErr } = await supabase.from("cases").insert(casePayload);
        if (insErr) console.error("[Step4AI] case insert failed:", insErr.message);
      }
    } catch (err) {
      console.error("[Step4AI] diagnosis error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setAiResult({
        source: "pending",
        diagnosis: "pending",
        diagnosis_display: "AI Unavailable — Pending Doctor Review",
        confidence: 0, severity: 0, severity_label: "Pending",
        top_3: [], category: null,
      });
    } finally {
      setLoading(false);
    }
  }, [user, savedPatient, screeningData]);

  useEffect(() => { runDiagnosis(); }, [runDiagnosis]);

  const isCancer = aiResult ? CANCER_CLASSES.includes(aiResult.diagnosis) : false;
  const classWarning = aiResult ? CLASS_WARNINGS[aiResult.diagnosis] : undefined;
  const isUrgent = aiResult?.urgent?.isUrgent;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onContinue(); }}>
      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
        {t("ap_s4_title")}
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        {loading ? loadingText : t("ap_s4_subtitle")}
      </p>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl p-8 mb-6 text-center" style={{ background: "var(--color-card)", border: "1px solid var(--color-primary-200)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(184,147,106,0.15)" }}>
            <Brain size={28} style={{ color: "#b8936a" }} className="animate-pulse" />
          </div>
          <p className="font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>{loadingText}</p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Processing {savedPatient.photoCount} photo{savedPatient.photoCount !== 1 ? "s" : ""} with screening data
          </p>
          <div className="mt-4 w-48 h-1.5 rounded-full mx-auto overflow-hidden" style={{ background: "var(--color-primary-200)" }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: "#b8936a", width: "60%" }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl p-4 mb-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#d97706" }}>AI service issue</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{error}. Using fallback analysis. Doctor will review manually.</p>
          </div>
        </div>
      )}

      {/* Urgent Referral Banner */}
      {!loading && isUrgent && aiResult?.urgent && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(220,38,38,0.04)", border: "2px solid rgba(220,38,38,0.25)" }}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(220,38,38,0.1)" }}>
              <ShieldAlert size={22} style={{ color: "#dc2626" }} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: "#dc2626" }}>{aiResult.urgent.triggerName}</p>
              <p className="text-sm mt-1" style={{ color: "#7f1d1d" }}>{aiResult.urgent.message}</p>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            The AI classification is shown below for reference, but this presentation may indicate a condition outside the AI&apos;s scope. In-person specialist evaluation is strongly recommended.
          </p>
        </div>
      )}

      {/* API Clinical Warnings */}
      {!loading && aiResult?.api_warnings && aiResult.api_warnings.length > 0 && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={17} style={{ color: "#d97706", flexShrink: 0 }} />
            <p className="text-sm font-bold" style={{ color: "#d97706" }}>Clinical Flags from Screening</p>
          </div>
          <ul className="space-y-1.5">
            {aiResult.api_warnings.map((w, i) => (
              <li key={i} className="text-xs leading-relaxed" style={{ color: "#d97706" }}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Result Card */}
      {!loading && aiResult && (
        <div className="rounded-2xl p-6 mb-6" style={{ background: "var(--color-card)", border: "1px solid var(--color-primary-200)" }}>
          {classWarning && <ClassWarningBanner warning={classWarning} />}

          {isCancer && !classWarning && (
            <div className="flex items-start gap-3 rounded-xl p-4 mb-5" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
              <ShieldAlert size={20} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#dc2626" }}>Cancer Flag — Urgent Referral Recommended</p>
                <p className="text-xs mt-0.5" style={{ color: "#7f1d1d" }}>
                  AI has detected a potentially malignant condition. Please review carefully.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: aiResult.source === "ai" ? "rgba(74,154,74,0.12)" : "rgba(184,147,106,0.15)" }}>
              <Brain size={20} style={{ color: aiResult.source === "ai" ? "#4a9a4a" : "#b8936a" }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {aiResult.source === "ai" ? "AI Screening Complete" : "AI Unavailable"}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {aiResult.source === "ai" ? "Results ready for doctor review" : "Doctor will review manually"}
              </p>
            </div>
          </div>

          {aiResult.source === "ai" && (
            <div className="rounded-xl p-5 mb-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-primary-200)" }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>Primary Diagnosis</p>
                  <p className="text-lg font-serif font-bold" style={{ color: isCancer ? "#dc2626" : "var(--color-text-primary)" }}>
                    {aiResult.diagnosis_display}
                  </p>
                </div>
                <SeverityBadge label={aiResult.severity_label} />
              </div>
              <ConfidenceBar confidence={aiResult.confidence} />

              {aiResult.top_3.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-secondary)" }}>Differential Diagnosis</p>
                  <div className="space-y-2">
                    {aiResult.top_3.map((pred, idx) => {
                      const pct = Math.round(pred.confidence * 100);
                      const isCp = CANCER_CLASSES.includes(pred.class);
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-xs font-mono w-5 text-right" style={{ color: "var(--color-text-secondary)" }}>{idx + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-medium" style={{ color: isCp ? "#dc2626" : "var(--color-text-primary)" }}>
                                {CLASS_DISPLAY_NAMES[pred.class] || pred.class}{isCp ? " ⚠" : ""}
                              </span>
                              <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full" style={{ background: "var(--color-primary-200)" }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isCp ? "#dc2626" : "#b8936a" }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {aiResult.source === "pending" && (
            <div className="rounded-xl p-5 mb-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-primary-200)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                AI screening could not be completed. The patient&apos;s data has been saved. The doctor can review and diagnose manually.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-primary)" }}>
              <Camera size={15} style={{ color: "#b8936a" }} />
              <span><strong>{savedPatient.photoCount}</strong> {t("ap_s4_photos_saved")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-primary)" }}>
              <ClipboardList size={15} style={{ color: "#b8936a" }} />
              <span>{t("ap_s4_screening_saved")} — {screeningData.bodyLocation}</span>
            </div>
          </div>

          {filledPreviews.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>{t("ap_s4_captured")}</p>
              <div className="flex gap-2 flex-wrap">
                {filledPreviews.map((src, idx) => (
                  <img key={idx} src={src} alt={`Photo ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" style={{ border: "1px solid var(--color-primary-200)" }} />
                ))}
              </div>
            </div>
          )}

          {aiResult.source === "ai" && (
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(184,147,106,0.2)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                This is an AI screening tool and not a medical diagnosis. A qualified doctor will review and confirm this result.
              </p>
            </div>
          )}
        </div>
      )}

      {savedPatient.photoUploadFailed > 0 && (
        <div className="rounded-xl px-4 py-3 mb-5 text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "#d97706" }}>
          {t("ap_s4_upload_fail").replace("{count}", String(savedPatient.photoUploadFailed))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 rounded-lg font-semibold text-white min-h-[44px] transition-opacity"
          style={{ background: "#b8936a", opacity: loading ? 0.5 : 1, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {t("ap_s4_continue")}
        </button>
      </div>
    </form>
  );
}
