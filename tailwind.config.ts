import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          deep: "hsl(var(--error-deep))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 잉크 계단 — ink(제목) → body(본문) → muted-foreground(캡션) → faint(플레이스홀더)
        ink: "hsl(var(--ink))",
        body: "hsl(var(--body))",
        faint: "hsl(var(--faint))",
        link: {
          DEFAULT: "hsl(var(--link))",
          deep: "hsl(var(--link-deep))",
          soft: "hsl(var(--link-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "hsl(var(--warning-soft))",
          deep: "hsl(var(--warning-deep))",
        },
        // 작은 아이콘·강조 요소 전용 accent. chrome 채우기에는 쓰지 않습니다.
        "accent-cyan": "hsl(var(--accent-cyan))",
        "accent-violet": "hsl(var(--accent-violet))",
        "accent-pink": "hsl(var(--accent-pink))",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Geist 계층 — 클수록 자간을 조입니다.
        "display-xl": ["48px", { lineHeight: "48px", letterSpacing: "-2.4px", fontWeight: "600" }],
        "heading-lg": ["32px", { lineHeight: "40px", letterSpacing: "-1.28px", fontWeight: "600" }],
        "heading-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.4px", fontWeight: "600" }],
        "label-sm": ["14px", { lineHeight: "20px", letterSpacing: "-0.28px", fontWeight: "500" }],
      },
      borderRadius: {
        // 6px 사각은 앱·내비 크롬, 12~16px는 콘텐츠 카드, pill은 마케팅 CTA 전용.
        sm: "0.375rem",
        md: "0.75rem",
        lg: "1rem",
        pill: "100px",
        "pill-category": "64px",
      },
      boxShadow: {
        // 깊이는 1px hairline이 먼저고, 그림자는 속삭이는 수준까지만.
        whisper: "0px 1px 1px rgb(0 0 0 / 0.04)",
        floating: "0px 2px 2px rgb(0 0 0 / 0.04), 0px 8px 16px -4px rgb(0 0 0 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
