/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        card: "var(--color-card)",
        primary: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          500: "#b8936a",
          600: "#a48155",
          700: "#9a7a4f",
        },
        secondary: {
          400: "#d4b896",
          500: "#c9a584",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        success: {
          bg: "var(--color-success-bg)",
          text: "#4a9a4a",
        },
        separator: "var(--color-separator)",
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
        DEFAULT: "var(--shadow-default)",
        sm: "var(--shadow-sm)",
        lg: "var(--shadow-lg)",
        /* Use shadow-row on repeating list items — tiny single-layer shadow
           with a warm tint instead of stacking shadow-xl/2xl */
        row: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(139 90 43 / 0.06)",
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        lg: "10px",
      },
      backgroundImage: {
        "grain": "var(--bg-grain)",
      },
    },
  },
  plugins: [],
};
