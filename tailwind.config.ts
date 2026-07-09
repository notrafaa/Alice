import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Anime dusk-sky backdrop (indigo night)
        abyss: "#0e0a1f",
        void: "#171034",
        panel: "#1d1440",
        // Pastel anime accents (sakura / school at dusk).
        // Keys kept as "neon" so utility classes stay stable across themes.
        neon: {
          pink: "#ff6fa5",
          violet: "#a78bfa",
          blue: "#8ab6ff",
          cyan: "#9be8ff",
          gold: "#ffd166",
          green: "#7ee8a2",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        "neon-pink": "0 0 20px rgba(255, 111, 165, 0.45)",
        "neon-blue": "0 0 20px rgba(138, 182, 255, 0.45)",
        "neon-violet": "0 0 24px rgba(167, 139, 250, 0.4)",
      },
      keyframes: {
        "slow-pan": {
          "0%, 100%": { transform: "translate3d(-2%, -1%, 0) scale(1.06)" },
          "50%": { transform: "translate3d(2%, 1%, 0) scale(1.1)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "slow-pan": "slow-pan 24s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
