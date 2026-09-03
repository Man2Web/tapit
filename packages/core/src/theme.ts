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
    name: "Apple Studio Crisp",
    subtitle: "Cupertino Light",
    description: "Pure Apple HIG aesthetic with clean titanium borders, SF typography, and subtle micro-shadows.",
    badge: "Apple HIG",
    themeStyle: "light",
  },
  {
    id: "executive_pass",
    name: "Executive Obsidian Pass",
    subtitle: "Midnight Pro",
    description: "High-status executive wallet pass with deep obsidian backdrop, metallic accents, and verified badge.",
    badge: "Executive",
    themeStyle: "dark",
  },
  {
    id: "modern_glass",
    name: "macOS Sonoma Glass",
    subtitle: "Frosted Glassmorphism",
    description: "Authentic macOS glass sheet featuring real blur filters, soft ambient glows, and floating action rows.",
    badge: "macOS",
    themeStyle: "dark",
  },
  {
    id: "editorial_slate",
    name: "Architectural Slate",
    subtitle: "Human Editorial",
    description: "Tactile architectural layout with crisp typography hierarchy, structured dividers, and clean grid alignment.",
    badge: "Editorial",
    themeStyle: "dark",
  },
  {
    id: "paper_linen",
    name: "Warm Ivory Linen",
    subtitle: "Stationery Press",
    description: "Organic stationery card aesthetic crafted with natural warm ivory tones, subtle debossing, and soft shadows.",
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
  { id: "pacific", name: "Pacific Blue", hex: "#0071E3" },
  { id: "violet", name: "Titanium Violet", hex: "#7C2FD6" },
  { id: "obsidian", name: "Midnight Black", hex: "#0F172A" },
  { id: "emerald", name: "Emerald Sage", hex: "#10B981" },
  { id: "amber", name: "Sunset Amber", hex: "#F59E0B" },
  { id: "rose", name: "Rose Gold", hex: "#E11D48" },
  { id: "spacegray", name: "Space Gray", hex: "#475569" },
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
  primary: "#0071E3",
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
