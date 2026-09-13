export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        4.5: "1.125rem",
      },
      colors: {
        ink: {
          950: "#0B1B2B",
          900: "#102A41",
          800: "#16324F",
          700: "#1F4262",
          600: "#2C577D",
        },
        brand: {
          50: "#EAF6F5",
          100: "#CFEBE9",
          400: "#2FA39B",
          500: "#14877F",
          600: "#0F6E6A",
          700: "#0B5551",
        },
        surface: {
          DEFAULT: "#F5F7FA",
          muted: "#EEF1F5",
        },
        amber: {
          500: "#C98A2C",
          600: "#A9721F",
        },
        success: {
          50: "#EAF7EF",
          600: "#1E8E5A",
        },
        danger: {
          50: "#FBEAE8",
          600: "#C0362C",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 42 65 / 0.06), 0 1px 1px 0 rgb(16 42 65 / 0.04)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
        pageEntrance: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        badgePop: {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "60%": { transform: "scale(1.15)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "page-entrance": "pageEntrance 250ms ease-out forwards",
        "badge-pop": "badgePop 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "float-slow": "floatSlow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
