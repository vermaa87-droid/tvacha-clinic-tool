"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ClipboardList, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import {
  verifyClinic,
  submitQrCheckIn,
  type CheckInResult,
} from "@/lib/qrCheckIn";

type ClinicInfo = {
  id: string;
  clinic_name: string;
  full_name: string;
};

type Step = "verifying" | "not_found" | "form" | "details" | "done";

const AVG_MINUTES_PER_TOKEN = 12;

export default function CheckinPage() {
  const params = useParams<{ clinic_id: string }>();
  const clinicId = params?.clinic_id ?? "";
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>("verifying");
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [complaint, setComplaint] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!clinicId) {
        if (!cancelled) setStep("not_found");
        return;
      }
      const c = await verifyClinic(clinicId);
      if (cancelled) return;
      if (!c) {
        setStep("not_found");
      } else {
        setClinic(c as ClinicInfo);
        setStep("form");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const submit = async (withDetails = false) => {
    setError(null);
    const normalized = phone.replace(/\D/g, "").slice(-10);
    if (normalized.length !== 10) {
      setError(t("checkin_invalid_phone"));
      return;
    }
    setSubmitting(true);
    const res = await submitQrCheckIn({
      clinicId,
      phone: normalized,
      name: withDetails ? name || null : null,
      chiefComplaint: withDetails ? complaint || null : null,
    });
    setSubmitting(false);
    if (!res.ok) {
      if (res.reason === "clinic_not_found") {
        setError(t("checkin_error_clinic"));
      } else {
        setError(res.message || t("checkin_error_generic"));
      }
      return;
    }
    setResult(res);
    setStep("done");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "var(--color-primary-50, #faf8f4)",
        color: "var(--color-text-primary, #1a1612)",
      }}
    >
      <header
        className="px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-separator)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-serif font-semibold text-lg"
            style={{ backgroundColor: "#b8936a" }}
          >
            T
          </div>
          <div>
            <p
              className="text-sm font-serif font-semibold leading-none"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Tvacha Clinic
            </p>
            {clinic && (
              <p
                className="text-[11px] uppercase tracking-wider"
                style={{ color: "#7a5c35" }}
              >
                {clinic.clinic_name}
              </p>
            )}
          </div>
        </div>
        <LanguageToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {step === "verifying" && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <Loader2
                  className="w-8 h-8 mx-auto animate-spin"
                  style={{ color: "#b8936a" }}
                />
              </motion.div>
            )}

            {step === "not_found" && (
              <motion.div
                key="not_found"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center p-6 rounded-xl"
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid rgba(220,38,38,0.2)",
                }}
              >
                <p className="font-serif text-xl mb-2">
                  {t("checkin_error_clinic")}
                </p>
              </motion.div>
            )}

            {(step === "form" || step === "details") && clinic && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: "var(--color-card, #ffffff)",
                  border: "1px solid var(--color-separator)",
                }}
              >
                <h1
                  className="text-2xl sm:text-3xl font-serif font-semibold mb-1"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("checkin_welcome_title").replace(
                    "{clinic}",
                    clinic.clinic_name
                  )}
                </h1>
                <p
                  className="text-sm mb-6"
                  style={{ color: "var(--color-text-secondary, #6b5d4f)" }}
                >
                  {t("checkin_welcome_subtitle")}
                </p>

                <label className="block text-sm font-medium mb-2">
                  {t("checkin_phone_label")}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("checkin_phone_placeholder")}
                  className="w-full px-4 py-3 rounded-lg border text-base focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "rgba(184,147,106,0.4)",
                    backgroundColor: "var(--color-card, #fff)",
                    color: "var(--color-text-primary)",
                  }}
                  autoFocus
                />

                {step === "details" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("checkin_name_label")}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border text-base focus:outline-none focus:ring-2"
                        style={{
                          borderColor: "rgba(184,147,106,0.4)",
                          backgroundColor: "var(--color-card, #fff)",
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {t("checkin_complaint_label")}
                      </label>
                      <ComplaintPills value={complaint} onChange={setComplaint} />
                    </div>
                  </motion.div>
                )}

                {error && (
                  <p className="mt-3 text-sm" style={{ color: "#b91c1c" }}>
                    {error}
                  </p>
                )}

                <div className="mt-6 space-y-2">
                  {step === "form" ? (
                    <>
                      <button
                        onClick={() => submit(false)}
                        disabled={submitting || phone.trim().length === 0}
                        className="w-full min-h-[48px] rounded-lg text-base font-medium text-white transition-colors disabled:opacity-50"
                        style={{ backgroundColor: "#b8936a" }}
                      >
                        {submitting ? t("checkin_submitting") : t("checkin_continue")}
                      </button>
                      <button
                        onClick={() => setStep("details")}
                        className="w-full min-h-[44px] rounded-lg text-sm font-medium transition-colors"
                        style={{ color: "#7a5c35" }}
                      >
                        {t("checkin_walk_in")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => submit(true)}
                        disabled={submitting}
                        className="w-full min-h-[48px] rounded-lg text-base font-medium text-white transition-colors disabled:opacity-50"
                        style={{ backgroundColor: "#b8936a" }}
                      >
                        {submitting ? t("checkin_submitting") : t("checkin_submit")}
                      </button>
                      <button
                        onClick={() => setStep("form")}
                        className="w-full min-h-[44px] rounded-lg text-sm font-medium transition-colors"
                        style={{ color: "#7a5c35" }}
                      >
                        {t("checkin_back")}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {step === "done" && result && result.ok && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl text-center"
                style={{
                  backgroundColor: "var(--color-card, #ffffff)",
                  border: "1px solid var(--color-separator)",
                }}
              >
                <CheckmarkAnimation />

                {result.kind === "existing_appointment" ? (
                  <>
                    <h2
                      className="text-2xl sm:text-3xl font-serif font-semibold mt-4"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {t("checkin_appt_title")}
                    </h2>
                    <p
                      className="mt-2 text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {t("checkin_appt_msg")}
                    </p>
                  </>
                ) : (
                  <WalkInSummary
                    tokenNumber={result.token.token_number}
                    deduplicated={result.deduplicated}
                    t={t}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function ComplaintPills({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLanguage();
  const options = [
    t("queue_complaint_acne"),
    t("queue_complaint_rash"),
    t("queue_complaint_pigmentation"),
    t("queue_complaint_hair_fall"),
    t("queue_complaint_skin_check"),
    t("queue_complaint_follow_up"),
    t("queue_complaint_other"),
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? "" : o)}
          className={`min-h-[40px] px-3 py-1.5 rounded-full text-sm transition-colors ${
            value === o ? "text-white" : "border"
          }`}
          style={
            value === o
              ? { backgroundColor: "#b8936a" }
              : {
                  borderColor: "rgba(184,147,106,0.4)",
                  color: "var(--color-text-primary)",
                }
          }
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function WalkInSummary({
  tokenNumber,
  deduplicated,
  t,
}: {
  tokenNumber: number;
  deduplicated: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const formatted = `T-${String(tokenNumber).padStart(3, "0")}`;
  const waitMinutes = Math.max(0, (tokenNumber - 1) * AVG_MINUTES_PER_TOKEN);
  return (
    <>
      <h2
        className="text-2xl sm:text-3xl font-serif font-semibold mt-4"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {t("checkin_token_title")}
      </h2>
      <p
        className="mt-1 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {t("checkin_token_msg")}
      </p>
      <div
        className="my-6 mx-auto w-fit px-6 py-4 rounded-xl"
        style={{
          border: "2px solid #b8936a",
          backgroundColor: "rgba(184,147,106,0.08)",
        }}
      >
        <p
          className="font-serif font-semibold text-5xl sm:text-6xl"
          style={{ color: "#b8936a", fontFamily: "'Cormorant Garamond', serif" }}
        >
          {formatted}
        </p>
      </div>
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
        style={{
          backgroundColor: "rgba(184,147,106,0.12)",
          color: "#7a5c35",
        }}
      >
        <ClipboardList className="w-4 h-4" />
        {t("checkin_token_wait")}: ~{waitMinutes} {t("queue_minutes")}
      </div>
      {deduplicated && (
        <p
          className="mt-4 text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {t("checkin_token_dedup")}
        </p>
      )}
    </>
  );
}

function CheckmarkAnimation() {
  return (
    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
      style={{ backgroundColor: "rgba(45,74,62,0.12)" }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <Check className="w-8 h-8" style={{ color: "#2d4a3e" }} strokeWidth={3} />
      </motion.div>
    </div>
  );
}
