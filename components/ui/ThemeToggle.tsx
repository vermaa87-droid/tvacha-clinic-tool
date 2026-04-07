"use client";

import { useTheme } from "@/lib/theme-context";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: isDark ? "rgba(184,147,106,0.15)" : "rgba(184,147,106,0.08)",
        borderRadius: 20,
        padding: "4px 8px",
        gap: 4,
        border: "1px solid rgba(184,147,106,0.2)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.3s ease",
      }}
    >
      <Sun
        size={14}
        style={{
          color: isDark ? "#8a7e70" : "#b8936a",
          transition: "color 0.3s ease",
        }}
      />
      <div
        style={{
          width: 24,
          height: 14,
          borderRadius: 7,
          background: isDark ? "#b8936a" : "rgba(184,147,106,0.3)",
          position: "relative",
          transition: "background 0.3s ease",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 2,
            left: isDark ? 12 : 2,
            transition: "left 0.3s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      <Moon
        size={14}
        style={{
          color: isDark ? "#b8936a" : "#8a7e70",
          transition: "color 0.3s ease",
        }}
      />
    </button>
  );
}
