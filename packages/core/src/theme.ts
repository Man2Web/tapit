import type { Json } from "@tapit/types";

export type WebTemplateId =
  | "executive"
  | "minimal_light"
  | "aurora_gradient"
  | "cyber_bold"
  | "obsidian_gold";

export type WebTemplateDef = {
  id: WebTemplateId;
  name: string;
  description: string;
  previewBg: string;
  previewBorder: string;
};

export const WEB_TEMPLATES: WebTemplateDef[] = [
  {
    id: "executive",
    name: "Executive Glass",
    description: "Sleek dark obsidian glassmorphism with metallic glow",
    previewBg: "bg-slate-900",
    previewBorder: "border-indigo-500",
  },
  {
    id: "minimal_light",
    name: "Minimalist Light",
    description: "Clean Apple-style crisp light profile with soft pastels",
    previewBg: "bg-slate-100",
    previewBorder: "border-slate-300",
  },
  {
    id: "aurora_gradient",
    name: "Aurora Gradient",
    description: "Vibrant animated mesh gradient banner with neon accents",
    previewBg: "bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400",
    previewBorder: "border-pink-500",
  },
  {
    id: "cyber_bold",
    name: "Cyber Bold",
    description: "High-contrast modern pop-art styling with bold borders",
    previewBg: "bg-yellow-400",
    previewBorder: "border-black",
  },
  {
    id: "obsidian_gold",
    name: "Obsidian Gold",
    description: "Luxury black & champagne gold executive pass",
    previewBg: "bg-black",
    previewBorder: "border-amber-500",
  },
];

export type ProfileTheme = {
  template: WebTemplateId | string;
  primary: string;
  accent: string;
  font: string;
  layout: string;
  avatar_focus?: string;
  avatar_offset_y?: number;
};

export const defaultTheme: ProfileTheme = {
  template: "executive",
  primary: "#7C2FD6",
  accent: "#9550E8",
  font: "system",
  layout: "stacked",
  avatar_focus: "head",
};

export function resolveTheme(theme: Json | null | undefined): ProfileTheme {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return defaultTheme;
  }
  return { ...defaultTheme, ...theme };
}
