/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#edeae5",
        primary: {
          50: "#f2efe9",
          100: "#ede9e1",
          200: "#e8e0d0",
          500: "#b8936a",
          600: "#a48155",
          700: "#9a7a4f",
        },
        secondary: {
          400: "#d4b896",
          500: "#c9a584",
        },
        text: {
          primary: "#1a1612",
          secondary: "#9a8a76",
          muted: "#6b5d4f",
        },
        success: {
          bg: "#e8f5e8",
          text: "#4a9a4a",
        },
        separator: "rgba(180,150,100,0.15)",
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Outfit'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem",
      },
      boxShadow: {
        DEFAULT: "0 8px 40px rgba(0,0,0,0.08)",
        sm: "0 2px 8px rgba(0,0,0,0.06)",
        lg: "0 12px 48px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        lg: "10px",
      },
      backgroundImage: {
        "grain": "url('data:image/svg+xml,%3Csvg viewBox=%270 0 1200 1200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noise%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 /%3E%3C/filter%3E%3Crect width=%271200%27 height=%271200%27 fill=%27%23F2EFE9%27 /%3E%3Crect width=%271200%27 height=%271200%27 fill=%27%23000%27 opacity=%270.02%27 filter=%27url(%23noise)%27 /%3E%3C/svg%3E')",
      },
    },
  },
  plugins: [],
};
