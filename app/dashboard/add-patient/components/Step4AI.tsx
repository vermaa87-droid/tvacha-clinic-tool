"use client";

import { Brain, Camera, ClipboardList } from "lucide-react";
import type { ScreeningData, SavedPatient } from "../wizard-types";

interface Step4AIProps {
  photos: (File | null)[];
  previews: (string | null)[];
  screeningData: ScreeningData;
  savedPatient: SavedPatient;
  onContinue: () => void;
}

/**
 * Phase 1 placeholder — Phase 2 will replace the card content with a real
 * AI call and result display. Props (photos, previews, screeningData, savedPatient)
 * are already wired so Phase 2 just adds logic here without touching the parent.
 */
export function Step4AI({ photos, previews, screeningData, savedPatient, onContinue }: Step4AIProps) {
  const filledPhotos = photos.filter(Boolean);
  const filledPreviews = previews.filter((p): p is string => p !== null);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onContinue(); }}>
      <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "#1a1612" }}>
        AI Diagnosis
      </h2>
      <p className="text-sm mb-8" style={{ color: "#9a8a76" }}>
        Patient data saved. AI screening results will appear here once enabled.
      </p>

      {/* Placeholder card */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: "#fef9f0", border: "1px solid #f0e0c0" }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(184,147,106,0.15)" }}
          >
            <Brain size={20} style={{ color: "#b8936a" }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: "#1a1612" }}>AI Integration</p>
            <p className="text-xs" style={{ color: "#9a8a76" }}>Coming in Phase 2</p>
          </div>
        </div>

        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #e8e0d0" }}
        >
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#9a8a76" }}>
            AI integration coming soon. The patient&apos;s photos and screening data have been
            saved. When AI is enabled, the diagnosis will appear here automatically.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#1a1612" }}>
              <Camera size={15} style={{ color: "#b8936a" }} />
              <span>
                <strong>{savedPatient.photoCount}</strong> photo{savedPatient.photoCount !== 1 ? "s" : ""} saved
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#1a1612" }}>
              <ClipboardList size={15} style={{ color: "#b8936a" }} />
              <span>Screening data saved — {screeningData.bodyLocation}</span>
            </div>
          </div>
        </div>

        {/* Photo thumbnails */}
        {filledPreviews.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "#9a8a76" }}>
              Captured photos
            </p>
            <div className="flex gap-2 flex-wrap">
              {filledPreviews.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`Photo ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded-lg"
                  style={{ border: "1px solid #e8e0d0" }}
                />
              ))}
              {/* Show placeholder slots for any that failed upload */}
              {Array.from({ length: Math.max(0, filledPhotos.length - filledPreviews.length) }).map((_, idx) => (
                <div
                  key={`missing-${idx}`}
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ background: "#f5f2ed", border: "1px solid #e0d5c4" }}
                >
                  <Camera size={18} style={{ color: "#9a8a76" }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {savedPatient.photoUploadFailed > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-5 text-sm"
          style={{ background: "#fffbeb", border: "1px solid #fbbf24", color: "#92400e" }}
        >
          Patient saved but {savedPatient.photoUploadFailed} photo(s) failed to upload. You can
          upload them later from the patient&apos;s profile.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-3 rounded-lg font-semibold text-white min-h-[44px]"
          style={{ background: "#b8936a" }}
        >
          Continue to Summary →
        </button>
      </div>
    </form>
  );
}
