import type { Config } from "tailwindcss";
import { tokens } from "../../packages/config/tokens";

// NativeWind targets Tailwind v3's engine (apps/web is on v4 — see docs/DECISIONS.md).
// Values are pulled from packages/config/tokens.ts, the single source of truth. tokens.ts
// stores raw numbers (correct for RN's unitless dp values); Tailwind's CSS pipeline
// needs real CSS values, so numeric tokens are converted to px/string here, not in the
// token file itself.
const px = (value: number) => `${value}px`;
const mapValues = (obj: Record<string, number>, transform: (n: number) => string) =>
  Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, transform(value)]));

export default {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // "class" (app-controlled), not the default "media" (OS-only) — Expo Router's internal
  // theming calls NativeWind's color-scheme sync, which throws under "media". Dark mode
  // itself isn't built yet (optional for v1, §13.5); this only fixes that crash.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: tokens.color.brand,
        neutral: tokens.color.neutral,
        success: tokens.color.success,
        warning: tokens.color.warning,
        danger: tokens.color.danger,

        // React Native Reusables' scaffolded components (Button, Input, ...) reference
        // this shadcn-style semantic palette. Mapped onto our own tokens rather than
        // shadcn's default CSS-variable gray theme, so "primary" etc. stays on-brand.
        // Static (light-mode) values for now — dark mode is optional for v1 (§13.5);
        // revisit as CSS variables if/when dark mode is actually built.
        background: tokens.color.neutral[0],
        foreground: tokens.color.neutral[950],
        card: tokens.color.neutral[0],
        "card-foreground": tokens.color.neutral[950],
        popover: tokens.color.neutral[0],
        "popover-foreground": tokens.color.neutral[950],
        primary: tokens.color.brand[600],
        "primary-foreground": tokens.color.neutral[0],
        secondary: tokens.color.neutral[100],
        "secondary-foreground": tokens.color.neutral[950],
        muted: tokens.color.neutral[100],
        "muted-foreground": tokens.color.neutral[600],
        accent: tokens.color.neutral[100],
        "accent-foreground": tokens.color.neutral[950],
        destructive: tokens.color.danger,
        "destructive-foreground": tokens.color.neutral[0],
        border: tokens.color.neutral[200],
        input: tokens.color.neutral[200],
        ring: tokens.color.brand[600],
      },
      fontSize: mapValues(tokens.fontSize, px),
      fontWeight: mapValues(tokens.fontWeight, String),
      spacing: mapValues(tokens.space, px),
      borderRadius: mapValues(tokens.radius, px),
    },
  },
  plugins: [],
} satisfies Config;
