"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, ExternalLink, ArrowLeft } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { signConsent, getConsentSignedUrl } from "@/lib/consentPdf";
import type { ConsentTemplate, Patient, ConsentRecord } from "@/lib/types";

type Status = "loading" | "ready" | "already" | "invalid" | "signing" | "done";

export default function ConsentSignPage({
  params,
}: {
  params: { record_id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { doctor } = useAuthStore();
  const { t } = useLanguage();

  const templateId = searchParams.get("template");
  const patientId = searchParams.get("patient");
  const visitId = searchParams.get("visit");

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [template, setTemplate] = useState<ConsentTemplate | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [existingRecord, setExistingRecord] = useState<ConsentRecord | null>(
    null
  );
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  const sigRef = useRef<SignatureCanvas | null>(null);
  const sigBoxRef = useRef<HTMLDivElement | null>(null);
  const [sigBoxHeight, setSigBoxHeight] = useState(320);

  const load = useCallback(async () => {
    if (!doctor?.id || !templateId || !patientId) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");

    const [recRes, tplRes, patRes] = await Promise.all([
      supabase
        .from("consent_records")
        .select("*")
        .eq("id", params.record_id)
        .maybeSingle(),
      supabase
        .from("consent_templates")
        .select("*")
        .eq("id", templateId)
        .eq("doctor_id", doctor.id)
        .maybeSingle(),
      supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .maybeSingle(),
    ]);

    if (recRes.data) {
      setExistingRecord(recRes.data as ConsentRecord);
      const url = await getConsentSignedUrl(patientId, params.record_id, 3600);
      setExistingPdfUrl(url);
      setStatus("already");
      return;
    }

    if (!tplRes.data || !patRes.data) {
      setStatus("invalid");
      return;
    }

    setTemplate(tplRes.data as ConsentTemplate);
    setPatient(patRes.data as Patient);

    const initial: Record<string, boolean> = {};
    for (const cb of (tplRes.data as ConsentTemplate).checkboxes ?? []) {
      initial[cb.key] = false;
    }
    setChecks(initial);
    setStatus("ready");
  }, [doctor?.id, templateId, patientId, params.record_id]);

  useEffect(() => {
    load();
  }, [load]);

  // Resize signature canvas on container size change.
  useEffect(() => {
    if (status !== "ready") return;
    const update = () => {
      const el = sigBoxRef.current;
      if (!el) return;
      const h = Math.max(300, Math.min(420, el.clientHeight));
      setSigBoxHeight(h);
      // SignatureCanvas needs an explicit canvas resize to clear properly.
      sigRef.current?.clear();
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [status]);

  const allChecked = useMemo(() => {
    if (!template) return false;
    return template.checkboxes.every((cb) => checks[cb.key]);
  }, [template, checks]);

  const clearSignature = () => sigRef.current?.clear();

  const submit = async () => {
    if (!doctor?.id || !template || !patient) return;
    if (!allChecked) {
      setErrorMsg(t("consents_sign_need_checkboxes"));
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setErrorMsg(t("consents_sign_need_signature"));
      return;
    }

    setErrorMsg(null);
    setStatus("signing");

    const signatureDataUrl = sigRef.current
      .getCanvas()
      .toDataURL("image/png");

    const checkboxes = template.checkboxes.map((cb) => ({
      key: cb.key,
      label: cb.label,
      checked: !!checks[cb.key],
    }));

    const result = await signConsent({
      doctorId: doctor.id,
      patientId: patient.id,
      visitId: visitId ?? null,
      template,
      checkboxes,
      signatureDataUrl,
    });

    if (result.error || !result.record) {
      setErrorMsg(result.error?.message ?? t("consents_sign_error"));
      setStatus("ready");
      return;
    }

    setSignedPdfUrl(result.pdfUrl);
    setStatus("done");

    // Auto-return to patient page after a brief celebration.
    setTimeout(() => {
      router.push(`/dashboard/patients/${patient.id}?tab=consents`);
    }, 2400);
  };

  const goBack = () => {
    if (patientId) {
      router.push(`/dashboard/patients/${patientId}?tab=consents`);
    } else {
      router.back();
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1 text-sm hover:underline min-h-[44px]"
            style={{ color: "#b8936a" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("consents_sign_back_to_visit")}
          </button>
        </div>

        {status === "loading" && (
          <div className="py-20 text-center text-text-muted">
            {t("consents_sign_loading")}
          </div>
        )}

        {status === "invalid" && (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid #e8dfcf",
            }}
          >
            <p className="text-text-primary text-lg mb-2">
              {t("consents_sign_invalid")}
            </p>
            <Button variant="outline" onClick={goBack} className="mt-4">
              {t("consents_sign_back_to_visit")}
            </Button>
          </div>
        )}

        {status === "already" && existingRecord && (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid #e8dfcf",
            }}
          >
            <Check
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: "#b8936a" }}
            />
            <h2
              className="text-2xl font-semibold text-text-primary mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t("consents_sign_already")}
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              {existingRecord.procedure_name} —{" "}
              {format(new Date(existingRecord.signed_at), "dd MMM yyyy, h:mm a")}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {existingPdfUrl && (
                <a
                  href={existingPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="primary" className="inline-flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    {t("consents_sign_already_view")}
                  </Button>
                </a>
              )}
              <Button variant="outline" onClick={goBack}>
                {t("consents_sign_back_to_visit")}
              </Button>
            </div>
          </div>
        )}

        {(status === "ready" || status === "signing") && template && patient && (
          <SignForm
            t={t}
            template={template}
            patient={patient}
            doctorName={doctor?.full_name ?? doctor?.clinic_name ?? "Doctor"}
            checks={checks}
            setChecks={setChecks}
            sigRef={sigRef}
            sigBoxRef={sigBoxRef}
            sigBoxHeight={sigBoxHeight}
            allChecked={allChecked}
            errorMsg={errorMsg}
            onClearSignature={clearSignature}
            onSubmit={submit}
            submitting={status === "signing"}
          />
        )}

        <AnimatePresence>
          {status === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center px-4"
              style={{ backgroundColor: "rgba(26,22,18,0.55)" }}
            >
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl p-8 text-center max-w-md w-full"
                style={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid #b8936a",
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 14,
                    delay: 0.15,
                  }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(184,147,106,0.18)" }}
                >
                  <Check className="w-8 h-8" style={{ color: "#b8936a" }} />
                </motion.div>
                <h2
                  className="text-2xl font-semibold text-text-primary mb-1"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("consents_sign_success_title")}
                </h2>
                <p className="text-text-secondary text-sm mb-5">
                  {t("consents_sign_success_subtitle")}
                </p>
                {signedPdfUrl && (
                  <a
                    href={signedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t("consents_sign_success_view")}
                    </Button>
                  </a>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SignForm({
  t,
  template,
  patient,
  doctorName,
  checks,
  setChecks,
  sigRef,
  sigBoxRef,
  sigBoxHeight,
  allChecked,
  errorMsg,
  onClearSignature,
  onSubmit,
  submitting,
}: {
  t: ReturnType<typeof useLanguage>["t"];
  template: ConsentTemplate;
  patient: Patient;
  doctorName: string;
  checks: Record<string, boolean>;
  setChecks: (next: Record<string, boolean>) => void;
  sigRef: React.MutableRefObject<SignatureCanvas | null>;
  sigBoxRef: React.MutableRefObject<HTMLDivElement | null>;
  sigBoxHeight: number;
  allChecked: boolean;
  errorMsg: string | null;
  onClearSignature: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: header + body text + checkboxes */}
      <section className="lg:col-span-3 space-y-4">
        <header
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-card)",
            border: "1px solid #e8dfcf",
          }}
        >
          <h1
            className="text-2xl sm:text-3xl font-semibold text-text-primary"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {template.title}
          </h1>
          {template.procedure_type && (
            <p className="text-text-secondary mt-1 text-sm">
              {template.procedure_type}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <Field label={t("consents_sign_patient_label")} value={patient.name} />
            <Field label={t("consents_sign_doctor_label")} value={doctorName} />
            <Field
              label={t("consents_sign_procedure_label")}
              value={template.procedure_type || template.title}
            />
            <Field
              label={t("consents_sign_date_label")}
              value={format(new Date(), "dd MMM yyyy")}
            />
          </div>
        </header>

        <p className="text-sm text-text-secondary px-1">
          {t("consents_sign_intro")}
        </p>

        <div
          className="rounded-xl p-5 max-h-[55vh] overflow-y-auto"
          style={{
            backgroundColor: "var(--color-card)",
            border: "1px solid #e8dfcf",
            // Body text MUST be sans-serif per CLAUDE.md (Outfit, NOT Cormorant).
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <p className="whitespace-pre-line text-text-primary leading-relaxed text-base">
            {template.body_text}
          </p>
        </div>

        <div className="space-y-2">
          {template.checkboxes.map((cb) => (
            <label
              key={cb.key}
              className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors min-h-[44px]"
              style={{
                backgroundColor: checks[cb.key]
                  ? "rgba(184,147,106,0.10)"
                  : "var(--color-card)",
                border: "1px solid",
                borderColor: checks[cb.key]
                  ? "#b8936a"
                  : "rgba(184,147,106,0.25)",
              }}
            >
              <input
                type="checkbox"
                checked={!!checks[cb.key]}
                onChange={(e) =>
                  setChecks({ ...checks, [cb.key]: e.target.checked })
                }
                className="mt-1 w-5 h-5 rounded border-primary-200 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm sm:text-base text-text-primary">
                {cb.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Right: signature pad + submit */}
      <section className="lg:col-span-2 space-y-4 lg:sticky lg:top-6 self-start">
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-card)",
            border: "1px solid #e8dfcf",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2
              className="text-lg font-semibold text-text-primary"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {t("consents_sign_signature_title")}
            </h2>
            <button
              type="button"
              onClick={onClearSignature}
              className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary min-h-[44px] px-2"
            >
              <RotateCcw className="w-3 h-3" />
              {t("consents_sign_clear")}
            </button>
          </div>
          <p className="text-xs text-text-muted mb-3">
            {t("consents_sign_signature_help")}
          </p>
          <div
            ref={sigBoxRef}
            className="rounded-lg overflow-hidden touch-none"
            style={{
              height: sigBoxHeight,
              backgroundColor: "#ffffff",
              border: "1px dashed #b8936a",
            }}
          >
            <SignatureCanvas
              ref={(r) => {
                sigRef.current = r;
              }}
              penColor="#1a1612"
              canvasProps={{
                style: {
                  width: "100%",
                  height: "100%",
                  display: "block",
                  touchAction: "none",
                },
              }}
            />
          </div>

          {errorMsg && (
            <p
              className="text-sm mt-3 px-1"
              style={{ color: "#b91c1c" }}
              role="alert"
            >
              {errorMsg}
            </p>
          )}

          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!allChecked || submitting}
            loading={submitting}
            className="w-full mt-4 min-h-[52px] inline-flex items-center justify-center gap-2 text-base"
          >
            <Check className="w-5 h-5" />
            {submitting
              ? t("consents_sign_signing")
              : t("consents_sign_button")}
          </Button>

          {!allChecked && (
            <p className="text-xs text-text-muted text-center mt-2">
              {t("consents_sign_need_checkboxes")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="text-text-primary font-medium truncate">{value}</p>
    </div>
  );
}
