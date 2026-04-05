"use client";

import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";

const SWATCHES: { type: number; color: string; labelKey: TranslationKey }[] = [
  { type: 1, color: "#FCDCCE", labelKey: "ap_s2_fitz_very_light" },
  { type: 2, color: "#F5C5A3", labelKey: "ap_s2_fitz_light" },
  { type: 3, color: "#D4A574", labelKey: "ap_s2_fitz_medium" },
  { type: 4, color: "#C68642", labelKey: "ap_s2_fitz_olive" },
  { type: 5, color: "#8D5524", labelKey: "ap_s2_fitz_brown" },
  { type: 6, color: "#5A3825", labelKey: "ap_s2_fitz_dark" },
];

interface FitzpatrickSwatchesProps {
  value: number | null;
  onChange: (type: number) => void;
  error?: string;
}

export function FitzpatrickSwatches({ value, onChange, error }: FitzpatrickSwatchesProps) {
  const { t } = useLanguage();

  return (
    <div>
      <div className="flex gap-3 flex-wrap">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.type}
            type="button"
            onClick={() => onChange(swatch.type)}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: swatch.color,
                border:
                  value === swatch.type
                    ? "3px solid #b8936a"
                    : "2px solid #e0d5c4",
                transition: "border-color 0.15s",
                flexShrink: 0,
              }}
            />
            <span className="text-xs text-center" style={{ color: "#9a8a76", maxWidth: 52 }}>
              {t(swatch.labelKey)}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
