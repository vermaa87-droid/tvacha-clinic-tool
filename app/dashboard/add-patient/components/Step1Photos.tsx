"use client";

import { useRef, useState } from "react";
import { Camera, X, Lightbulb, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface Step1PhotosProps {
  photoSlots: (File | null)[];
  previewSlots: (string | null)[];
  onSetSlot: (index: number, file: File, preview: string) => void;
  onClearSlot: (index: number) => void;
  onNext: () => void;
}

export function Step1Photos({
  photoSlots,
  previewSlots,
  onSetSlot,
  onClearSlot,
  onNext,
}: Step1PhotosProps) {
  const { t } = useLanguage();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photoGridRef = useRef<HTMLDivElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const SLOT_LABELS = [t("ap_s1_close_up"), t("ap_s1_medium"), t("ap_s1_different")];

  const openCamera = (index: number) => {
    setActiveSlot(index);
    setTimeout(() => inputRef.current?.click(), 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file !== undefined && activeSlot !== null) {
      const preview = URL.createObjectURL(file);
      onSetSlot(activeSlot, file, preview);
      setPhotoError(null);
    }
    e.target.value = "";
    setActiveSlot(null);
  };

  const filledCount = photoSlots.filter(Boolean).length;
  const hasPhotos = filledCount >= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPhotos) {
      setShowSkipModal(true);
      return;
    }
    onNext();
  };

  const handleConfirmSkip = () => {
    setShowSkipModal(false);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
        {t("ap_s1_title")}
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        {t("ap_s1_subtitle")}
      </p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Photo slots */}
      <div
        ref={photoGridRef}
        className={`grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 mb-6 rounded-xl p-2 -m-2 ${photoError ? "field-error-input" : ""}`}
      >
        {SLOT_LABELS.map((label, index) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className="w-full relative" style={{ paddingBottom: "100%" }}>
              {previewSlots[index] ? (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <img
                    src={previewSlots[index]!}
                    alt={label}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onClearSlot(index)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    aria-label={`Remove ${label} photo`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openCamera(index)}
                  className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors hover:bg-amber-50"
                  style={{ border: "2px dashed #b8936a", background: "#fef9f4" }}
                >
                  <Camera size={28} style={{ color: "#b8936a" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    {t("ap_s1_tap")}
                  </span>
                </button>
              )}
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Tip card */}
      <div
        className="flex items-start gap-3 rounded-xl p-4 mb-8"
        style={{ background: "#fef9f0", border: "1px solid #f0e0c0" }}
      >
        <Lightbulb size={18} style={{ color: "#b8936a", flexShrink: 0, marginTop: 1 }} />
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {t("ap_s1_tip")}
        </p>
      </div>

      {filledCount > 0 && filledCount < 3 && (
        <p className="text-sm text-center mb-3" style={{ color: "#b8936a" }}>
          {t("ap_s1_count").replace("{count}", String(filledCount))}
        </p>
      )}

      {photoError && (
        <p className="form-error-summary text-center">{photoError}</p>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        {!hasPhotos ? (
          <button
            type="button"
            onClick={() => setShowSkipModal(true)}
            className="text-sm font-medium underline-offset-4 hover:underline transition-colors min-h-[44px] sm:min-h-0 px-2 sm:px-0 text-left"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {t("ap_s1_skip")}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-white transition-opacity min-h-[44px]"
          style={{ background: "#b8936a", cursor: "pointer" }}
        >
          {t("ap_s1_next")}
        </button>
      </div>

      {/* Skip-photos confirmation modal */}
      {showSkipModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowSkipModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--color-card)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(245,158,11,0.12)" }}
              >
                <AlertTriangle size={20} style={{ color: "#d97706" }} />
              </div>
              <h3 className="text-lg font-serif font-bold mt-1" style={{ color: "var(--color-text-primary)" }}>
                {t("ap_s1_skip_modal_title")}
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
              {t("ap_s1_skip_modal_body")}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSkipModal(false)}
                className="px-5 py-2.5 rounded-lg font-semibold border text-sm min-h-[44px]"
                style={{ borderColor: "var(--color-primary-200)", color: "var(--color-text-secondary)", background: "transparent" }}
              >
                {t("ap_s1_skip_modal_cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmSkip}
                className="px-5 py-2.5 rounded-lg font-semibold text-white text-sm min-h-[44px]"
                style={{ background: "#b8936a" }}
              >
                {t("ap_s1_skip_modal_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
