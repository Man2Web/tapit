// Single source of truth for the design system — see docs/PRODUCT.md §13.2.
// apps/web consumes this via tailwind-preset.js; apps/mobile via the NativeWind preset.
// Never write a raw pixel value, hex color, or arbitrary Tailwind class in app code —
// if a value is needed and no token fits, add the token here first.

export const tokens = {
  fontSize: { xs: 12, sm: 14, base: 16, lg: 20, xl: 26, "2xl": 34 },
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 },

  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },

  radius: { sm: 6, md: 10, lg: 16, xl: 24, full: 9999 },

  // Placeholder brand ramp — replace with real values before Phase 1 UI work.
  color: {
    brand: {
      50: "#f2f5ff",
      100: "#e0e7ff",
      300: "#a5b4fc",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      900: "#312e81",
    },
    neutral: {
      0: "#ffffff",
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      400: "#9ca3af",
      600: "#4b5563",
      800: "#1f2937",
      950: "#0a0a0a",
    },
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
  },

  elevation: { none: 0, sm: 1, md: 3, lg: 8 },
} as const;

export type Tokens = typeof tokens;
