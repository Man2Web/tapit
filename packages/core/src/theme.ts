import type { Json } from "@tapit/types";

export type WebTemplateId =
  | "apple_minimal"
  | "executive_pass"
  | "modern_glass"
  | "editorial_slate"
  | "paper_linen"
  | "gradient_aurora"
  | "soft_clay"
  | "midnight_ink"
  | "nordic_frost"
  | "neo_brutalist";

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
    name: "Minimal Light",
    subtitle: "Clean & Spacious",
    description: "Structured layout with light background, crisp borders, and high contrast typography.",
    badge: "Minimal",
    themeStyle: "light",
  },
  {
    id: "executive_pass",
    name: "Executive Dark",
    subtitle: "Dark Slate",
    description: "Professional high-contrast dark layout with clean borders and badge indicators.",
    badge: "Executive",
    themeStyle: "dark",
  },
  {
    id: "modern_glass",
    name: "Monochrome Grid",
    subtitle: "Clean Neutral",
    description: "Subtle monochrome backdrop with structured channel lists and QR actions.",
    badge: "Grid",
    themeStyle: "dark",
  },
  {
    id: "editorial_slate",
    name: "Architectural Grid",
    subtitle: "Technical Layout",
    description: "Structured architectural grid layout with prominent section dividers.",
    badge: "Architectural",
    themeStyle: "dark",
  },
  {
    id: "paper_linen",
    name: "Warm Warmth",
    subtitle: "Warm Neutral",
    description: "Clean neutral warm surface palette with subtle borders and clear contrast.",
    badge: "Warm",
    themeStyle: "warm",
  },
  {
    id: "gradient_aurora",
    name: "Aurora Gradient",
    subtitle: "Vibrant & Bold",
    description: "Gradient mesh background with frosted glass cards and vivid accent colors.",
    badge: "Aurora",
    themeStyle: "dark",
  },
  {
    id: "soft_clay",
    name: "Soft Clay",
    subtitle: "Organic Warmth",
    description: "Earthy clay tones with rounded surfaces and gentle drop shadows.",
    badge: "Clay",
    themeStyle: "warm",
  },
  {
    id: "midnight_ink",
    name: "Midnight Ink",
    subtitle: "Ultra Dark",
    description: "Deep midnight blue with luminous text and thin neon accent borders.",
    badge: "Midnight",
    themeStyle: "dark",
  },
  {
    id: "nordic_frost",
    name: "Nordic Frost",
    subtitle: "Cool & Crisp",
    description: "Ice-blue palette with sharp edges, frosted panels, and Scandinavian clarity.",
    badge: "Nordic",
    themeStyle: "light",
  },
  {
    id: "neo_brutalist",
    name: "Neo Brutalist",
    subtitle: "Bold & Raw",
    description: "Heavy borders, offset shadows, and stark black-on-white with punchy accent pops.",
    badge: "Brutalist",
    themeStyle: "light",
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
  font: FontFamily;
  layout: ProfileLayout;
  avatar_focus?: string;
  avatar_offset_y?: number;
  radius?: CardRadius;
  density?: CardDensity;
  button_style?: ButtonStyle;
  background_pattern?: BackgroundPattern;
};

export type FontFamily = "system" | "inter" | "outfit" | "playfair" | "jetbrains_mono" | "dm_sans";
export type ProfileLayout = "stacked" | "side_by_side" | "card";
export type CardRadius = "rounded" | "pill" | "sharp";
export type CardDensity = "spacious" | "compact";
export type ButtonStyle = "filled" | "outlined" | "pill" | "minimal";
export type BackgroundPattern = "solid" | "gradient" | "subtle_grid" | "dots" | "noise";

export type FontPreset = {
  id: FontFamily;
  name: string;
  googleFont?: string;
};

export const FONT_PRESETS: FontPreset[] = [
  { id: "system", name: "System Default" },
  { id: "inter", name: "Inter", googleFont: "Inter" },
  { id: "outfit", name: "Outfit", googleFont: "Outfit" },
  { id: "playfair", name: "Playfair Display", googleFont: "Playfair+Display" },
  { id: "jetbrains_mono", name: "JetBrains Mono", googleFont: "JetBrains+Mono" },
  { id: "dm_sans", name: "DM Sans", googleFont: "DM+Sans" },
];

export type ButtonStylePreset = {
  id: ButtonStyle;
  name: string;
  description: string;
};

export const BUTTON_STYLE_PRESETS: ButtonStylePreset[] = [
  { id: "filled", name: "Filled", description: "Solid background with contrasting text" },
  { id: "outlined", name: "Outlined", description: "Transparent with a visible border" },
  { id: "pill", name: "Pill", description: "Full rounded corners with filled background" },
  { id: "minimal", name: "Minimal", description: "No border, text-only with hover effect" },
];

export type BackgroundPatternPreset = {
  id: BackgroundPattern;
  name: string;
  description: string;
};

export const BACKGROUND_PATTERN_PRESETS: BackgroundPatternPreset[] = [
  { id: "solid", name: "Solid", description: "Clean solid background color" },
  { id: "gradient", name: "Gradient", description: "Subtle gradient from primary to accent" },
  { id: "subtle_grid", name: "Grid", description: "Faint grid overlay pattern" },
  { id: "dots", name: "Dots", description: "Subtle dot pattern overlay" },
  { id: "noise", name: "Noise", description: "Fine grain texture overlay" },
];

export const defaultTheme: ProfileTheme = {
  template: "apple_minimal",
  primary: "#2563EB",
  accent: "#7C2FD6",
  font: "system",
  layout: "stacked",
  avatar_focus: "head",
  radius: "rounded",
  density: "spacious",
  button_style: "filled",
  background_pattern: "solid",
};

export function resolveTheme(theme: Json | null | undefined): ProfileTheme {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return defaultTheme;
  }
  return { ...defaultTheme, ...theme };
}

