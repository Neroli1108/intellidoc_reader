/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Fraunces", "serif"],
      },
      colors: {
        // Custom color scheme
        accent: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          light: "#818cf8",
        },
        highlight: {
          yellow: "rgba(250, 204, 21, 0.4)",
          green: "rgba(34, 197, 94, 0.4)",
          blue: "rgba(59, 130, 246, 0.4)",
          purple: "rgba(168, 85, 247, 0.4)",
          red: "rgba(239, 68, 68, 0.4)",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        pulse: "pulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
