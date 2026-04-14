"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Check, Loader2, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLanguage } from "@/lib/language-context";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import {
  fetchFeedbackByToken,
  submitFeedback,
  type PublicFeedbackContext,
} from "@/lib/feedback";

type Step = "loading" | "invalid" | "already" | "rate" | "details" | "done";

export default function FeedbackPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>("loading");
  const [ctx, setCtx] = useState<PublicFeedbackContext | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [improvement, setImprovement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        if (!cancelled) setStep("invalid");
        return;
      }
      const data = await fetchFeedbackByToken(token);
      if (cancelled) return;
      if (!data) {
        setStep("invalid");
        return;
      }
      setCtx(data);
      if (data.submittedAt) {
        setStep("already");
      } else {
        setStep("rate");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const positive = rating >= 4;

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return;
    setError(null);
    setSubmitting(true);
    const res = await submitFeedback({
      token,
      rating,
      comment: positive ? comment || null : null,
      improvement: !positive ? improvement || null : null,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message || t("feedback_error"));
      return;
    }
    setStep("done");
  };

  const visitDateLabel = (() => {
    if (!ctx?.submittedAt && ctx?.expiresAt) {
      try {
        const expires = parseISO(ctx.expiresAt);
        const est = new Date(expires.getTime() - 7 * 24 * 60 * 60 * 1000);
        return format(est, "d MMM yyyy");
      } catch {
        return "";
      }
    }
    return "";
  })();

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
            {ctx?.clinicName && (
              <p
                className="text-[11px] uppercase tracking-wider"
                style={{ color: "#7a5c35" }}
              >
                {ctx.clinicName}
              </p>
            )}
          </div>
        </div>
        <LanguageToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {step === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <Loader2
                  className="w-8 h-8 mx-auto animate-spin"
                  style={{ color: "#b8936a" }}
                />
                <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {t("feedback_loading")}
                </p>
              </motion.div>
            )}

            {step === "invalid" && (
              <motion.div
                key="invalid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center p-6 rounded-xl"
                style={{
                  backgroundColor: "var(--color-card, #fff)",
                  border: "1px solid rgba(220,38,38,0.2)",
                }}
              >
                <h1 className="font-serif text-2xl mb-2">
                  {t("feedback_invalid_title")}
                </h1>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {t("feedback_invalid_desc")}
                </p>
              </motion.div>
            )}

            {step === "already" && (
              <motion.div
                key="already"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl text-center"
                style={{
                  backgroundColor: "var(--color-card, #fff)",
                  border: "1px solid var(--color-separator)",
                }}
              >
                <CheckmarkAnimation />
                <h2
                  className="text-2xl sm:text-3xl font-serif font-semibold mt-4"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("feedback_already_title")}
                </h2>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("feedback_already_desc")}
                </p>
              </motion.div>
            )}

            {(step === "rate" || step === "details") && ctx && (
              <motion.div
                key="rate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: "var(--color-card, #fff)",
                  border: "1px solid var(--color-separator)",
                }}
              >
                <h1
                  className="text-2xl sm:text-3xl font-serif font-semibold mb-1"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("feedback_title").replace("{doctor}", ctx.doctorName || ctx.clinicName)}
                </h1>
                {visitDateLabel && (
                  <p
                    className="text-sm mb-6"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t("feedback_visit_on").replace("{date}", visitDateLabel)}
                  </p>
                )}

                <p
                  className="text-sm font-medium mb-3"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("feedback_rate_label")}
                </p>
                <div className="flex items-center justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = (hover || rating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-label={t("feedback_star_aria").replace("{n}", String(n))}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => {
                          setRating(n);
                          setStep("details");
                        }}
                        className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform active:scale-95"
                      >
                        <Star
                          className="w-9 h-9"
                          style={{
                            color: filled ? "#b8936a" : "rgba(184,147,106,0.28)",
                            fill: filled ? "#b8936a" : "transparent",
                          }}
                          strokeWidth={1.5}
                        />
                      </button>
                    );
                  })}
                </div>

                {step === "details" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {positive ? (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t("feedback_comment_label")}
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder={t("feedback_comment_placeholder")}
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg border text-base focus:outline-none focus:ring-2 resize-none"
                          style={{
                            borderColor: "rgba(184,147,106,0.4)",
                            backgroundColor: "var(--color-card, #fff)",
                            color: "var(--color-text-primary)",
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t("feedback_improve_label")}
                        </label>
                        <textarea
                          value={improvement}
                          onChange={(e) => setImprovement(e.target.value)}
                          placeholder={t("feedback_improve_placeholder")}
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg border text-base focus:outline-none focus:ring-2 resize-none"
                          style={{
                            borderColor: "rgba(184,147,106,0.4)",
                            backgroundColor: "var(--color-card, #fff)",
                            color: "var(--color-text-primary)",
                          }}
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {error && (
                  <p className="mt-3 text-sm" style={{ color: "#b91c1c" }}>
                    {error}
                  </p>
                )}

                {step === "details" && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || rating < 1}
                    className="mt-6 w-full min-h-[48px] rounded-lg text-base font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#b8936a" }}
                  >
                    {submitting ? t("feedback_submitting") : t("feedback_submit")}
                  </button>
                )}
              </motion.div>
            )}

            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl text-center"
                style={{
                  backgroundColor: "var(--color-card, #fff)",
                  border: "1px solid var(--color-separator)",
                }}
              >
                <CheckmarkAnimation />
                <h2
                  className="text-2xl sm:text-3xl font-serif font-semibold mt-4"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("feedback_thanks_title")}
                </h2>
                <p
                  className="mt-2 text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {positive
                    ? t("feedback_thanks_positive")
                    : t("feedback_thanks_negative")}
                </p>

                {positive && <GoogleReviewCTA t={t} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function GoogleReviewCTA({
  t,
}: {
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    window.open("https://www.google.com/search?q=tvacha+clinic+review", "_blank");
  };

  if (clicked) return null;

  return (
    <div className="mt-6">
      <p
        className="text-xs mb-3"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {t("feedback_google_hint")}
      </p>
      <button
        onClick={handleClick}
        className="w-full min-h-[48px] rounded-lg text-base font-medium inline-flex items-center justify-center gap-2 transition-colors border"
        style={{
          borderColor: "rgba(184,147,106,0.5)",
          color: "#7a5c35",
        }}
      >
        <ExternalLink className="w-4 h-4" />
        {t("feedback_google_cta")}
      </button>
    </div>
  );
}

function CheckmarkAnimation() {
  return (
    <div
      className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
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
