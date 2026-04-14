"use client";

import { useState } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD            = "#b8936a";
const FILL_A          = "rgba(184,147,106,0.06)";   // default zone fill — variant A
const FILL_B          = "rgba(184,147,106,0.11)";   // default zone fill — variant B
const FILL_HOVER      = "rgba(184,147,106,0.26)";
const FILL_SELECTED   = "rgba(184,147,106,0.44)";
const STROKE_DEFAULT  = "rgba(184,147,106,0.40)";   // boundary lines (always visible)
const STROKE_HOVER    = "rgba(184,147,106,0.70)";
const STROKE_SELECTED = GOLD;
const LABEL_DEFAULT   = "rgba(184,147,106,0.55)";
const LABEL_SELECTED  = GOLD;

// ── Zone data ─────────────────────────────────────────────────────────────────
// viewBox: 0 0 200 500
// Anatomical orientation (front view):
//   patient LEFT  = viewer RIGHT (large x, ~130-170)
//   patient RIGHT = viewer LEFT  (small x, ~30-70)
// Each Zone maps to one dropdown value; multiple paths can share the same zone.

interface ZonePath {
  d: string;
  lx: number;   // label x
  ly: number;   // label y
  lbl: string;  // label text (empty = no label)
}

interface Zone {
  value: string;
  label: string;
  alt: "a" | "b";
  paths: ZonePath[];
}

const ZONES: Zone[] = [
  // ── Rendered bottom-to-top (first = bottommost layer) ────────────────────

  // 1. Torso — Chest/Back
  {
    value: "Chest/Back",
    label: "Chest / Back",
    alt: "a",
    paths: [
      {
        // Tapers from shoulders (~x 57-143) to waist (~x 70-130) to hips (~x 65-135)
        d: `M 90 94
            C 80 94 62 100 57 115
            C 55 132 54 168 54 200
            C 54 230 58 254 67 268
            L 133 268
            C 142 254 146 230 146 200
            C 146 168 145 132 143 115
            C 138 100 120 94 110 94 Z`,
        lx: 100, ly: 184, lbl: "CHEST",
      },
    ],
  },

  // 2. Legs — all four segments map to "Legs"
  {
    value: "Legs",
    label: "Legs",
    alt: "b",
    paths: [
      // Right thigh (viewer's left)
      { d: `M 69 270 L 100 270 C 100 308 98 344 94 378 L 73 378 C 69 344 67 308 69 270 Z`, lx: 83, ly: 322, lbl: "R LEG" },
      // Right lower leg
      { d: `M 73 380 L 94 380 C 96 418 96 448 94 463 L 78 463 C 76 448 74 418 73 380 Z`, lx: 83, ly: 418, lbl: "" },
      // Left thigh (viewer's right)
      { d: `M 100 270 L 131 270 C 133 308 130 344 126 378 L 105 378 C 101 344 99 308 100 270 Z`, lx: 115, ly: 322, lbl: "L LEG" },
      // Left lower leg
      { d: `M 105 380 L 126 380 C 127 418 125 448 123 463 L 107 463 C 105 448 103 418 105 380 Z`, lx: 114, ly: 418, lbl: "" },
    ],
  },

  // 3. Arms — both arms map to "Arms"
  {
    value: "Arms",
    label: "Arms",
    alt: "a",
    paths: [
      // Right arm (viewer's left)
      {
        d: `M 60 100
            C 52 104 40 117 37 133
            C 35 162 35 210 34 265
            L 54 265
            C 55 210 58 162 60 133
            C 62 117 62 108 62 100 Z`,
        lx: 46, ly: 188, lbl: "R ARM",
      },
      // Left arm (viewer's right)
      {
        d: `M 140 100
            C 148 104 160 117 163 133
            C 165 162 165 210 166 265
            L 146 265
            C 145 210 142 162 140 133
            C 138 117 138 108 140 100 Z`,
        lx: 154, ly: 188, lbl: "L ARM",
      },
    ],
  },

  // ── Head regions (rendered above torso / limbs) ───────────────────────────

  // 4. Scalp — top half of head
  {
    value: "Scalp",
    label: "Scalp",
    alt: "b",
    paths: [
      {
        d: `M 73 40 C 73 24 84 9 100 9 C 116 9 127 24 127 40 Z`,
        lx: 100, ly: 26, lbl: "SCALP",
      },
    ],
  },

  // 5. Face — lower half of head (chin, cheeks, forehead zone)
  {
    value: "Face",
    label: "Face",
    alt: "a",
    paths: [
      {
        d: `M 73 40
            C 73 57 83 69 91 72
            C 95 74 100 75 105 73
            C 117 69 127 57 127 40 Z`,
        lx: 100, ly: 58, lbl: "FACE",
      },
    ],
  },

  // 6. Neck
  {
    value: "Neck",
    label: "Neck",
    alt: "b",
    paths: [
      {
        d: `M 90 72 C 90 80 89 88 89 94 L 111 94 C 111 88 110 80 110 72 Z`,
        lx: 100, ly: 83, lbl: "NECK",
      },
    ],
  },

  // ── Hands (above arms in SVG stack) ──────────────────────────────────────

  // 7. Hands / Fingers
  {
    value: "Hands/Fingers",
    label: "Hands / Fingers",
    alt: "a",
    paths: [
      // Right hand (viewer's left) — rounded oval with slight thumb bump
      {
        d: `M 31 265
            C 28 276 28 294 32 302
            C 37 310 50 311 56 303
            C 60 295 59 277 56 265 Z`,
        lx: 43, ly: 286, lbl: "HAND",
      },
      // Left hand (viewer's right)
      {
        d: `M 144 265
            C 141 277 140 295 144 303
            C 150 311 163 310 168 302
            C 172 294 172 276 169 265 Z`,
        lx: 156, ly: 286, lbl: "HAND",
      },
    ],
  },

  // ── Feet (above legs in SVG stack) ────────────────────────────────────────

  // 8. Feet / Toes
  {
    value: "Feet/Toes",
    label: "Feet / Toes",
    alt: "b",
    paths: [
      // Right foot (viewer's left — extends to the left)
      {
        d: `M 94 464
            C 94 472 91 480 84 484
            C 76 488 62 485 58 477
            C 56 470 59 464 73 464 Z`,
        lx: 76, ly: 476, lbl: "FOOT",
      },
      // Left foot (viewer's right — extends to the right)
      {
        d: `M 106 464
            C 106 472 109 480 116 484
            C 124 488 138 485 142 477
            C 144 470 141 464 127 464 Z`,
        lx: 124, ly: 476, lbl: "FOOT",
      },
    ],
  },

  // ── Groin / Armpits (topmost — smallest zones need click priority) ────────

  // 9. Groin / Armpits
  {
    value: "Groin/Armpits",
    label: "Groin / Armpits",
    alt: "a",
    paths: [
      // Groin (between thighs)
      { d: `M 88 268 L 112 268 L 114 280 C 110 285 90 285 86 280 Z`, lx: 100, ly: 278, lbl: "" },
      // Right armpit (viewer's left — between torso and right arm)
      { d: `M 60 115 C 57 126 56 136 57 143 C 53 141 49 134 51 123 Z`, lx: 55, ly: 130, lbl: "" },
      // Left armpit (viewer's right — between torso and left arm)
      { d: `M 140 115 C 143 126 144 136 143 143 C 147 141 151 134 149 123 Z`, lx: 145, ly: 130, lbl: "" },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
interface BodyMapSelectorProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function BodyMapSelector({ value, onChange, error }: BodyMapSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const toggle = (v: string) => onChange(value === v ? "" : v);

  const getFill = (zone: Zone) => {
    if (value === zone.value) return FILL_SELECTED;
    if (hovered === zone.value) return FILL_HOVER;
    return zone.alt === "a" ? FILL_A : FILL_B;
  };

  const getStroke = (zone: Zone) => {
    if (value === zone.value) return STROKE_SELECTED;
    if (hovered === zone.value) return STROKE_HOVER;
    return STROKE_DEFAULT;
  };

  const getStrokeWidth = (zone: Zone) => {
    if (value === zone.value) return "1.8";
    if (hovered === zone.value) return "1.2";
    return "0.7";
  };

  const getLabelFill = (zone: Zone) =>
    value === zone.value ? LABEL_SELECTED : LABEL_DEFAULT;

  const selectedLabel =
    value === "Multiple areas"
      ? "Multiple areas"
      : ZONES.find((z) => z.value === value)?.label ?? null;

  return (
    <div className="space-y-3">
      {/* ── Body map SVG ───────────────────────────────────────────────── */}
      <div
        className="mx-auto select-none"
        style={{ maxWidth: 300 }}
        role="group"
        aria-label="Body region selector"
      >
        <svg
          viewBox="0 0 200 500"
          className="w-full h-auto block"
          style={{ touchAction: "manipulation" }}
        >
          {/* ── Decorative base silhouette (non-interactive) ─────────── */}
          {/* Drawn first so zone fills render on top. Provides visual   */}
          {/* continuity between zone borders. Outer stroke = gold 1.5px */}
          <g
            fill="rgba(184,147,106,0.04)"
            stroke={GOLD}
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={{ pointerEvents: "none" }}
          >
            {/* Head — smooth ellipse */}
            <ellipse cx="100" cy="40" rx="27" ry="31" />
            {/* Neck */}
            <path d="M 90 70 C 90 78 89 86 89 94 L 111 94 C 111 86 110 78 110 70 Z" />
            {/* Torso — tapers at waist, slight hip flare */}
            <path d="M 90 94 C 80 94 62 100 57 115 C 55 132 54 168 54 200 C 54 230 58 254 67 268 L 133 268 C 142 254 146 230 146 200 C 146 168 145 132 143 115 C 138 100 120 94 110 94 Z" />
            {/* Right arm (viewer's left) — tapers from shoulder to wrist */}
            <path d="M 60 100 C 52 104 40 117 37 133 C 35 162 35 210 34 265 L 54 265 C 55 210 58 162 60 133 C 62 117 62 108 62 100 Z" />
            {/* Left arm (viewer's right) */}
            <path d="M 140 100 C 148 104 160 117 163 133 C 165 162 165 210 166 265 L 146 265 C 145 210 142 162 140 133 C 138 117 138 108 140 100 Z" />
            {/* Right hand — rounded oval */}
            <path d="M 31 265 C 28 276 28 294 32 302 C 37 310 50 311 56 303 C 60 295 59 277 56 265 Z" />
            {/* Left hand */}
            <path d="M 144 265 C 141 277 140 295 144 303 C 150 311 163 310 168 302 C 172 294 172 276 169 265 Z" />
            {/* Right thigh */}
            <path d="M 69 270 L 100 270 C 100 308 98 344 94 378 L 73 378 C 69 344 67 308 69 270 Z" />
            {/* Left thigh */}
            <path d="M 100 270 L 131 270 C 133 308 130 344 126 378 L 105 378 C 101 344 99 308 100 270 Z" />
            {/* Right lower leg — narrows at ankle */}
            <path d="M 73 380 L 94 380 C 96 418 96 448 94 463 L 78 463 C 76 448 74 418 73 380 Z" />
            {/* Left lower leg */}
            <path d="M 105 380 L 126 380 C 127 418 125 448 123 463 L 107 463 C 105 448 103 418 105 380 Z" />
            {/* Right foot — angled outward */}
            <path d="M 94 464 C 94 472 91 480 84 484 C 76 488 62 485 58 477 C 56 470 59 464 73 464 Z" />
            {/* Left foot */}
            <path d="M 106 464 C 106 472 109 480 116 484 C 124 488 138 485 142 477 C 144 470 141 464 127 464 Z" />
          </g>

          {/* ── Tappable zone overlays + labels ─────────────────────── */}
          {ZONES.map((zone) => (
            <g
              key={zone.value}
              role="button"
              aria-label={zone.label}
              aria-pressed={value === zone.value}
              tabIndex={0}
              style={{ cursor: "pointer", outline: "none" }}
              onMouseEnter={() => setHovered(zone.value)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => toggle(zone.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(zone.value);
                }
              }}
            >
              {/* Paths */}
              {zone.paths.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  fill={getFill(zone)}
                  stroke={getStroke(zone)}
                  strokeWidth={getStrokeWidth(zone)}
                  strokeLinejoin="round"
                  style={{
                    transition: "fill 0.12s ease, stroke 0.12s ease, stroke-width 0.1s ease",
                  }}
                />
              ))}

              {/* Labels — always visible, subtle by default */}
              {zone.paths.map((p, i) =>
                p.lbl ? (
                  <text
                    key={`lbl-${i}`}
                    x={p.lx}
                    y={p.ly}
                    textAnchor="middle"
                    fontSize="6"
                    fontWeight="700"
                    letterSpacing="0.6"
                    fill={getLabelFill(zone)}
                    style={{
                      pointerEvents: "none",
                      userSelect: "none",
                      fontFamily: "Outfit, sans-serif",
                      transition: "fill 0.12s ease",
                    }}
                  >
                    {p.lbl}
                  </text>
                ) : null
              )}

              <title>{zone.label}</title>
            </g>
          ))}
        </svg>
      </div>

      {/* ── Status line ─────────────────────────────────────────────────── */}
      <div className="text-center min-h-[20px]">
        {selectedLabel ? (
          <p className="text-sm font-semibold" style={{ color: GOLD }}>
            Selected:{" "}
            <span style={{ fontFamily: "'Outfit', sans-serif" }}>{selectedLabel}</span>
          </p>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Tap a region to mark the affected area
          </p>
        )}
      </div>

      {/* ── Multiple areas button ────────────────────────────────────────── */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => onChange(value === "Multiple areas" ? "" : "Multiple areas")}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]"
          style={{
            border: `1px solid ${
              value === "Multiple areas" ? GOLD : "rgba(184,147,106,0.38)"
            }`,
            backgroundColor:
              value === "Multiple areas"
                ? "rgba(184,147,106,0.12)"
                : "transparent",
            color:
              value === "Multiple areas" ? GOLD : "var(--color-text-secondary)",
          }}
        >
          Multiple areas
        </button>
      </div>

      {/* ── Validation error ─────────────────────────────────────────────── */}
      {error && (
        <p
          className="text-xs text-center mt-1"
          style={{ color: "var(--form-error)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
