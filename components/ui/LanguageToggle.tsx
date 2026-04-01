"use client";

import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "rgba(184,147,106,0.08)",
        borderRadius: 20,
        padding: "3px 6px",
        gap: 2,
        border: "1px solid rgba(184,147,106,0.2)",
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => setLanguage("en")}
        style={{
          background: language === "en" ? "rgba(184,147,106,0.15)" : "transparent",
          border: "none",
          padding: "3px 8px",
          borderRadius: 14,
          color: language === "en" ? "#b8936a" : "#9a8a76",
          fontWeight: language === "en" ? 600 : 400,
          fontFamily: "Outfit, sans-serif",
          fontSize: 12,
          cursor: "pointer",
          lineHeight: 1.4,
        }}
      >
        EN
      </button>
      <span style={{ color: "rgba(184,147,106,0.35)", fontSize: 11, lineHeight: 1 }}>|</span>
      <button
        onClick={() => setLanguage("hi")}
        style={{
          background: language === "hi" ? "rgba(184,147,106,0.15)" : "transparent",
          border: "none",
          padding: "3px 8px",
          borderRadius: 14,
          color: language === "hi" ? "#b8936a" : "#9a8a76",
          fontWeight: language === "hi" ? 600 : 400,
          fontFamily: "'Noto Sans Devanagari', system-ui, sans-serif",
          fontSize: 12,
          cursor: "pointer",
          lineHeight: 1.4,
        }}
      >
        हि
      </button>
    </div>
  );
}
