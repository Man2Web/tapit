import { tokens } from "@tapit/config";

// Ionicons, ActivityIndicator, and RN's Switch all take a raw `color` prop, not a Tailwind
// className — the one place PRODUCT.md §13.2 allows a resolved value instead of a class.
// Sourced from tokens.ts, never hand-typed hex, so this stays in sync with the Tailwind
// preset's semantic palette (tailwind.config.ts) automatically.
export const colors = {
  primary: tokens.color.brand[600],
  foreground: tokens.color.neutral[950],
  muted: tokens.color.neutral[400],
  mutedForeground: tokens.color.neutral[600],
  border: tokens.color.neutral[200],
  card: tokens.color.neutral[0],
  danger: tokens.color.danger,
  success: tokens.color.success,
} as const;
