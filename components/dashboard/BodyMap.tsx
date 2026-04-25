"use client";

import { useEffect, useMemo, useState } from "react";
import { HUMAN_BODY_SVG } from "./body-svg-source";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD = "#b8936a";

// ── Dermatology regions (per the Add Patient spec) ───────────────────────────
// Each region has a `value` (the form-facing string) and a list of hit-zones
// drawn on the body SVG. Multiple hit-zones can share a `value` — clicking any
// of them toggles the same region (e.g. both arms → "Arms or hands").
//
// Coordinates are in the SVG's 750×768 viewBox. The left figure (x ≈ 0-375) is
// anterior (front), the right figure (x ≈ 375-750) is posterior (back).
type Shape =
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "rect"; x: number; y: number; w: number; h: number; rx?: number };

interface Region {
  value: string;
  label: string;
  zones: Shape[];
}

const REGIONS: Region[] = [
  {
    value: "Scalp / head",
    label: "Scalp / head",
    zones: [
      // Front figure — top of head
      { type: "ellipse", cx: 180, cy: 40, rx: 42, ry: 30 },
      // Back figure — top of head
      { type: "ellipse", cx: 585, cy: 40, rx: 42, ry: 30 },
    ],
  },
  {
    value: "Face",
    label: "Face",
    zones: [
      // Front figure — face area only
      { type: "ellipse", cx: 180, cy: 80, rx: 38, ry: 28 },
    ],
  },
  {
    value: "Neck or chest",
    label: "Neck or chest",
    zones: [
      // Front figure — neck + chest
      { type: "rect", x: 110, y: 110, w: 145, h: 150, rx: 16 },
    ],
  },
  {
    value: "Stomach / abdomen",
    label: "Stomach / abdomen",
    zones: [
      // Front figure — mid-torso to waist
      { type: "rect", x: 115, y: 260, w: 135, h: 110, rx: 14 },
    ],
  },
  {
    value: "Back or shoulders",
    label: "Back or shoulders",
    zones: [
      // Back figure — shoulders, full back, buttocks (extends down to where legs begin)
      { type: "rect", x: 515, y: 110, w: 150, h: 310, rx: 16 },
    ],
  },
  {
    value: "Groin / armpits / skin folds",
    label: "Groin / armpits / skin folds",
    zones: [
      // Front — left armpit
      { type: "ellipse", cx: 110, cy: 195, rx: 22, ry: 24 },
      // Front — right armpit
      { type: "ellipse", cx: 250, cy: 195, rx: 22, ry: 24 },
      // Front — groin
      { type: "rect", x: 145, y: 370, w: 75, h: 55, rx: 16 },
    ],
  },
  {
    value: "Arms or hands",
    label: "Arms or hands",
    zones: [
      // Front — viewer's-left arm + hand (patient's right)
      { type: "rect", x: 30, y: 130, w: 90, h: 310, rx: 22 },
      // Front — viewer's-right arm + hand (patient's left)
      { type: "rect", x: 245, y: 130, w: 90, h: 310, rx: 22 },
      // Back — viewer's-left arm
      { type: "rect", x: 435, y: 130, w: 90, h: 310, rx: 22 },
      // Back — viewer's-right arm
      { type: "rect", x: 650, y: 130, w: 90, h: 310, rx: 22 },
    ],
  },
  {
    value: "Legs or feet",
    label: "Legs or feet",
    zones: [
      // Front — legs
      { type: "rect", x: 115, y: 420, w: 135, h: 340, rx: 22 },
      // Back — legs
      { type: "rect", x: 520, y: 420, w: 135, h: 340, rx: 22 },
    ],
  },
];

// ── Value encoding: comma-joined list of region values ───────────────────────
function parseValue(v: string): Set<string> {
  return new Set(
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function formatValue(set: Set<string>): string {
  return Array.from(set).join(", ");
}

// ── Component ─────────────────────────────────────────────────────────────────
interface BodyMapProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function BodyMap({ value, onChange, error }: BodyMapProps) {
  const [isDark, setIsDark] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // Watch the app's theme attribute so body/overlay colours can swap live.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const read = () =>
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  const selected = useMemo(() => parseValue(value), [value]);

  const toggleRegion = (regionValue: string) => {
    const next = new Set(selected);
    if (next.has(regionValue)) next.delete(regionValue);
    else next.add(regionValue);
    onChange(formatValue(next));
  };

  const FILL_HOVER = isDark
    ? "rgba(184,147,106,0.28)"
    : "rgba(184,147,106,0.22)";
  const FILL_SELECTED = isDark
    ? "rgba(184,147,106,0.50)"
    : "rgba(184,147,106,0.42)";

  const zoneFill = (r: Region): string => {
    if (selected.has(r.value)) return FILL_SELECTED;
    if (hovered === r.value) return FILL_HOVER;
    return "transparent";
  };

  const zoneStroke = (r: Region): string => {
    if (selected.has(r.value)) return GOLD;
    if (hovered === r.value) return "rgba(184,147,106,0.7)";
    return "transparent";
  };

  const selectedLabels = useMemo(
    () => REGIONS.filter((r) => selected.has(r.value)).map((r) => r.label),
    [selected]
  );

  return (
    <div className="space-y-3">
      {/* Scoped styles — dark-mode body recoloring + hover cursor */}
      <style>{`
        .tvacha-body svg path { transition: stroke 0.2s ease; }
        [data-theme="dark"] .tvacha-body svg path[stroke="#b8936a"] {
          stroke-opacity: 0.75;
        }
        .tvacha-body-overlay polygon,
        .tvacha-body-overlay rect,
        .tvacha-body-overlay ellipse {
          cursor: pointer;
          transition: fill 0.15s ease, stroke 0.15s ease;
          stroke-width: 2;
        }
      `}</style>

      <div
        className="relative mx-auto w-full select-none"
        style={{ maxWidth: 420 }}
      >
        {/* Inlined CC0 body illustration (decorative, non-interactive) */}
        <div
          className="tvacha-body"
          style={{ pointerEvents: "none" }}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: HUMAN_BODY_SVG }}
        />

        {/* Interactive overlay — same viewBox, absolute-positioned */}
        <svg
          viewBox="0 0 750 768"
          className="tvacha-body-overlay"
          role="group"
          aria-label="Body region selector"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {REGIONS.map((r) =>
            r.zones.map((z, i) => {
              const common = {
                fill: zoneFill(r),
                stroke: zoneStroke(r),
                onClick: () => toggleRegion(r.value),
                onMouseEnter: () => setHovered(r.value),
                onMouseLeave: () =>
                  setHovered((h) => (h === r.value ? null : h)),
                role: "button",
                "aria-label": r.label,
                "aria-pressed": selected.has(r.value),
                tabIndex: 0,
                onKeyDown: (e: React.KeyboardEvent<SVGElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleRegion(r.value);
                  }
                },
              };
              return z.type === "ellipse" ? (
                <ellipse
                  key={`${r.value}-${i}`}
                  cx={z.cx}
                  cy={z.cy}
                  rx={z.rx}
                  ry={z.ry}
                  {...common}
                >
                  <title>{r.label}</title>
                </ellipse>
              ) : (
                <rect
                  key={`${r.value}-${i}`}
                  x={z.x}
                  y={z.y}
                  width={z.w}
                  height={z.h}
                  rx={z.rx ?? 0}
                  {...common}
                >
                  <title>{r.label}</title>
                </rect>
              );
            })
          )}
        </svg>
      </div>

      {/* Selection summary */}
      <div className="text-center min-h-[20px]">
        {selectedLabels.length > 0 ? (
          <p className="text-sm font-semibold" style={{ color: GOLD }}>
            Selected:{" "}
            <span style={{ fontFamily: "'Outfit', sans-serif" }}>
              {selectedLabels.join(", ")}
            </span>
          </p>
        ) : (
          <p
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Tap one or more regions on the body diagram
          </p>
        )}
      </div>

      {/* Quick pill list — keyboard-accessible alternative to the SVG */}
      <div className="flex flex-wrap justify-center gap-2">
        {REGIONS.map((r) => {
          const active = selected.has(r.value);
          return (
            <button
              key={r.value}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggleRegion(r.value)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                border: `1px solid ${
                  active ? GOLD : "rgba(184,147,106,0.38)"
                }`,
                backgroundColor: active
                  ? "rgba(184,147,106,0.14)"
                  : "transparent",
                color: active ? GOLD : "var(--color-text-primary)",
                borderRadius: 6,
                cursor: "pointer",
                minHeight: 32,
                transition: "all 0.12s ease",
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p
          className="text-xs text-center"
          style={{ color: "var(--form-error)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
