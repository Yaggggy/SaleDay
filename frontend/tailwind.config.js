/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F4F6EF",
          soft: "#FBFCF9",
          line: "#DDE2D2",
        },
        ink: {
          DEFAULT: "#1E2E2A",
          soft: "#3E5049",
          faint: "#7C8B82",
        },
        tag: {
          DEFAULT: "#E4572E",
          dark: "#C4451F",
          light: "#FBE2D6",
        },
        marigold: {
          DEFAULT: "#F4B93F",
          dark: "#D99A1E",
          light: "#FDF0D3",
        },
        garden: {
          DEFAULT: "#3F7D58",
          dark: "#2E5F42",
          light: "#DCEEE1",
        },
        sky: {
          DEFAULT: "#3E7CB1",
          light: "#DCE9F4",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        card: "1.1rem",
        tag: "0.6rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,46,42,0.04), 0 8px 24px -12px rgba(30,46,42,0.18)",
        cardHover: "0 4px 8px rgba(30,46,42,0.06), 0 16px 32px -12px rgba(30,46,42,0.22)",
        tag: "0 2px 0 rgba(0,0,0,0.08)",
      },
      keyframes: {
        "pop-in": {
          "0%": { opacity: 0, transform: "scale(0.92) translateY(6px)" },
          "100%": { opacity: 1, transform: "scale(1) translateY(0)" },
        },
        "swing": {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        "sold-stamp": {
          "0%": { opacity: 0, transform: "scale(2.2) rotate(-14deg)" },
          "60%": { opacity: 1, transform: "scale(0.94) rotate(-14deg)" },
          "100%": { opacity: 1, transform: "scale(1) rotate(-14deg)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "swing-slow": "swing 6s ease-in-out infinite",
        "sold-stamp": "sold-stamp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
