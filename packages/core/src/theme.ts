import type { Json } from "@tapit/types";

// profiles.theme is stored as jsonb and defaults to '{}'. This is the shared
// fallback both apps/web and apps/mobile resolve against before rendering a card.
export type ProfileTheme = {
  template: string;
  primary: string;
  accent: string;
  font: string;
  layout: string;
};

export const defaultTheme: ProfileTheme = {
  template: "classic",
  primary: "#7C2FD6",
  accent: "#9550E8",
  font: "system",
  layout: "stacked",
};

export function resolveTheme(theme: Json | null | undefined): ProfileTheme {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return defaultTheme;
  }
  return { ...defaultTheme, ...theme };
}
