import type { Json } from "@tapit/types";

export type WebTemplateId =
  | "apple_minimal"
  | "executive_pass"
  | "modern_glass"
  | "editorial_slate"
  | "paper_linen";

export type WebTemplateDef = {
  id: WebTemplateId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  themeStyle: "light" | "dark" | "warm";
};

export const WEB_TEMPLATES: WebTemplateDef[] = [
  {
    id: "apple_minimal",
    name: "Studio Minimalist",
    subtitle: "Clean Light",
    description: "Pure minimalist aesthetic with crisp borders, typography hierarchy, and subtle micro-shadows.",
    badge: "Minimal",
    themeStyle: "light",
  },
  {
    id: "executive_pass",
    name: "Executive Pass",
    subtitle: "Midnight Obsidian",
    description: "High-status professional wallet pass with deep obsidian backdrop, metallic accents, and verified badge.",
    badge: "Executive",
    themeStyle: "dark",
  },
  {
    id: "modern_glass",
    name: "Monochrome Glass",
    subtitle: "Frosted Backdrop",
    description: "Translucent glass card featuring real blur filters, soft ambient glow, and clean action rows.",
    badge: "Glass",
    themeStyle: "dark",
  },
  {
    id: "editorial_slate",
    name: "Architectural Slate",
    subtitle: "Editorial Grid",
    description: "Tactile architectural layout with structured dividers, crisp typography, and refined grid alignment.",
    badge: "Editorial",
    themeStyle: "dark",
  },
  {
    id: "paper_linen",
    name: "Warm Stationery",
    subtitle: "Ivory Press",
    description: "Organic stationery card aesthetic crafted with natural warm ivory tones and debossed details.",
    badge: "Stationery",
    themeStyle: "warm",
  },
];

export type ColorPreset = {
  id: string;
  name: string;
  hex: string;
};

export const COLOR_PRESETS: ColorPreset[] = [
  { id: "azure", name: "Azure Blue", hex: "#2563EB" },
  { id: "violet", name: "Deep Violet", hex: "#7C2FD6" },
  { id: "slate", name: "Slate Black", hex: "#0F172A" },
  { id: "emerald", name: "Emerald Sage", hex: "#10B981" },
  { id: "amber", name: "Amber Gold", hex: "#F59E0B" },
  { id: "rose", name: "Crimson Rose", hex: "#E11D48" },
  { id: "neutral", name: "Neutral Gray", hex: "#475569" },
];

export type ProfileTheme = {
  template: WebTemplateId | string;
  primary: string;
  accent: string;
  font: string;
  layout: string;
  avatar_focus?: string;
  avatar_offset_y?: number;
  radius?: "rounded" | "pill" | "sharp";
  density?: "spacious" | "compact";
};

export const defaultTheme: ProfileTheme = {
  template: "apple_minimal",
  primary: "#2563EB",
  accent: "#7C2FD6",
  font: "system",
  layout: "stacked",
  avatar_focus: "head",
  radius: "rounded",
  density: "spacious",
};

export function resolveTheme(theme: Json | null | undefined): ProfileTheme {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return defaultTheme;
  }
  return { ...defaultTheme, ...theme };
}
