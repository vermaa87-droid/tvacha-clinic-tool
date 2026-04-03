"use client";

const SWATCHES = [
  { type: 1, color: "#FCDCCE", label: "Very Light" },
  { type: 2, color: "#F5C5A3", label: "Light" },
  { type: 3, color: "#D4A574", label: "Medium" },
  { type: 4, color: "#C68642", label: "Olive" },
  { type: 5, color: "#8D5524", label: "Brown" },
  { type: 6, color: "#5A3825", label: "Dark Brown" },
];

interface FitzpatrickSwatchesProps {
  value: number | null;
  onChange: (type: number) => void;
  error?: string;
}

export function FitzpatrickSwatches({ value, onChange, error }: FitzpatrickSwatchesProps) {
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
              {swatch.label}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
