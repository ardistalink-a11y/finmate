import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        "surface-2": "hsl(var(--surface-2))",
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--muted))",
        subtle: "hsl(var(--subtle))",
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          hover: "hsl(var(--accent-hover))",
          fg: "hsl(var(--accent-fg))",
        },
        income: "hsl(var(--income))",
        expense: "hsl(var(--expense))",
        warning: "hsl(var(--warning))",
      },
      borderRadius: { md: "8px", lg: "12px", xl: "16px" },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04)",
        "card-dark": "0 1px 2px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
